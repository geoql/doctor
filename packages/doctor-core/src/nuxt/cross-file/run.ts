import { parseSync } from 'oxc-parser';
import { relative } from 'node:path';
import type { Diagnostic } from '../../types.js';
import { isNuxtPageFile } from '../file-role.js';
import { parseSfcDescriptor } from '../../sfc/parse-sfc-descriptor.js';
import type { ProjectInfo } from '../../types/project-info.js';

export interface CrossFilePassOptions {
  files: string[];
  projectInfo: ProjectInfo;
}

export interface ParsedPageScript {
  file: string;
  relativePath: string;
  keys: string[];
  scriptSetupContent: string;
  scriptSetupLang: 'ts' | 'js';
  scriptSetupLine: number;
}

function extractDataFetchingKeys(content: string, lang: 'ts' | 'js'): string[] {
  const keys: string[] = [];
  try {
    const { program } = parseSync(`script.${lang}`, content, {
      sourceType: 'module',
      lang,
    });
    for (const stmt of program.body) {
      if (stmt.type === 'VariableDeclaration') {
        for (const decl of stmt.declarations) {
          const call = unwrapAwait(decl.init);
          if (call?.type !== 'CallExpression') continue;
          extractKeyFromCall(call, keys);
        }
      } else if (stmt.type === 'ExpressionStatement') {
        const expr = unwrapAwait(stmt.expression);
        if (expr?.type === 'CallExpression') {
          extractKeyFromCall(expr, keys);
        }
      }
    }
  } catch {}
  return keys;
}

type MaybeNode = { type: string; argument?: MaybeNode } | null | undefined;

function unwrapAwait<T extends MaybeNode>(node: T): MaybeNode {
  if (node?.type === 'AwaitExpression') return node.argument;
  return node;
}

function extractKeyFromCall(
  call: Record<string, unknown>,
  keys: string[],
): void {
  if (call.callee.type !== 'Identifier') return;
  const fnName = call.callee.name;
  if (fnName !== 'useAsyncData' && fnName !== 'useFetch') return;
  const keyArg = call.arguments[0];
  if (keyArg?.type === 'Literal' && typeof keyArg.value === 'string') {
    keys.push(keyArg.value);
  } else if (keyArg?.type === 'TemplateLiteral' && keyArg.quasis.length === 1) {
    const val = keyArg.quasis[0]?.value?.raw;
    if (val) keys.push(val);
  }
  if (fnName === 'useFetch' && call.arguments.length >= 2) {
    const optsArg = call.arguments[1];
    if (optsArg?.type === 'ObjectExpression') {
      for (const prop of optsArg.properties) {
        if (
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          prop.key.name === 'key' &&
          prop.value.type === 'Literal' &&
          typeof prop.value.value === 'string'
        ) {
          keys.push(prop.value.value);
        }
      }
    }
  }
}

export async function runCrossFilePass(
  opts: CrossFilePassOptions,
): Promise<Diagnostic[]> {
  const { files, projectInfo } = opts;
  if (projectInfo.framework !== 'nuxt') return [];
  const rootDir = projectInfo.rootDirectory;
  const pageFiles = files.filter((f) =>
    isNuxtPageFile(relative(rootDir, f).replace(/\\/g, '/')),
  );
  if (pageFiles.length === 0) return [];
  const parsed: ParsedPageScript[] = [];
  for (const file of pageFiles) {
    const descriptor = await parseSfcDescriptor(file);
    if (!descriptor) continue;
    const { scriptSetup } = descriptor;
    if (!scriptSetup) continue;
    parsed.push({
      file,
      relativePath: relative(rootDir, file).replace(/\\/g, '/'),
      keys: extractDataFetchingKeys(
        scriptSetup.content,
        scriptSetup.lang === 'ts' ? 'ts' : 'js',
      ),
      scriptSetupContent: scriptSetup.content,
      scriptSetupLang: scriptSetup.lang === 'ts' ? 'ts' : 'js',
      scriptSetupLine: scriptSetup.loc.start.line,
    });
  }
  return runCrossFileRules(parsed);
}

function runCrossFileRules(pages: ParsedPageScript[]): Diagnostic[] {
  const all: Diagnostic[] = [];
  all.push(...ruleNoSharedKeyAcrossPages(pages));
  all.push(...ruleSsrSafeOnMountedOnlyForClient(pages));
  return all;
}

function ruleNoSharedKeyAcrossPages(pages: ParsedPageScript[]): Diagnostic[] {
  const keyToFiles = new Map<string, string[]>();
  for (const page of pages) {
    for (const key of page.keys) {
      const existing = keyToFiles.get(key) ?? [];
      if (!existing.includes(page.file)) existing.push(page.file);
      keyToFiles.set(key, existing);
    }
  }
  const diags: Diagnostic[] = [];
  for (const [key, files] of keyToFiles) {
    if (files.length < 2) continue;
    for (const file of files) {
      diags.push({
        file,
        line: 1,
        column: 1,
        ruleId: 'nuxt-doctor/data-fetching/no-shared-key-across-pages',
        severity: 'warn',
        message: `Data fetching key "${key}" is shared across ${files.length} different page files. This causes cache collisions in useAsyncData/useFetch. Use a unique key per page.`,
        source: 'cross-file',
        recommendation: `Rename the key to something page-specific, e.g. "page-${key}" or "users-${key}".`,
      });
    }
  }
  return diags;
}

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'location',
  'history',
  'fetch',
  'XMLHttpRequest',
  'matchMedia',
  'IntersectionObserver',
  'MutationObserver',
  'indexedDB',
  'webkit',
  'moz',
  'onmessage',
]);

function ruleSsrSafeOnMountedOnlyForClient(
  pages: ParsedPageScript[],
): Diagnostic[] {
  const diags: Diagnostic[] = [];
  for (const page of pages) {
    const { program } = parseSync(
      `script.${page.scriptSetupLang}`,
      page.scriptSetupContent,
      { sourceType: 'module', lang: page.scriptSetupLang },
    );
    for (const stmt of program.body) {
      if (stmt.type === 'VariableDeclaration') {
        for (const decl of stmt.declarations) {
          const init = decl.init;
          if (!init) continue;
          if (init.type === 'CallExpression') {
            const call = init;
            if (isSkippedReactiveCall(call)) continue;
            checkCallForBrowserGlobal(call, page, diags);
          } else if (init.type === 'MemberExpression') {
            checkMemberForBrowserGlobal(init, page, diags);
          }
        }
      } else if (stmt.type === 'ExpressionStatement') {
        const expr = stmt.expression;
        if (expr.type === 'CallExpression') {
          if (isSkippedReactiveCall(expr)) continue;
          checkCallForBrowserGlobal(expr, page, diags);
        } else if (expr.type === 'MemberExpression') {
          checkMemberForBrowserGlobal(expr, page, diags);
        }
      }
    }
  }
  return diags;
}

const CLIENT_SAFE_WRAPPERS = new Set(['onMounted', 'watchEffect', 'watch']);

function isSkippedReactiveCall(call: {
  callee: { type: string; name?: string };
}): boolean {
  if (call.callee.type !== 'Identifier') return false;
  return CLIENT_SAFE_WRAPPERS.has(call.callee.name as string);
}

function checkCallForBrowserGlobal(
  call: Record<string, unknown>,
  page: ParsedPageScript,
  diags: Diagnostic[],
) {
  const callee = call.callee as Record<string, unknown>;
  if (callee.type !== 'MemberExpression') return;
  const obj = callee.object as Record<string, unknown>;
  if (obj.type !== 'Identifier' || !BROWSER_GLOBALS.has(obj.name as string))
    return;
  diags.push({
    file: page.file,
    line: page.scriptSetupLine,
    column: 1,
    ruleId: 'nuxt-doctor/data-fetching/ssr-safe-onMounted-only-for-client',
    severity: 'warn',
    message: `Browser global "${obj.name}" is accessed at setup top-level outside onMounted. This causes SSR/hydration mismatches. Move browser-only code inside onMounted or a client-only plugin.`,
    source: 'cross-file',
    recommendation: `Wrap "${obj.name}" access in onMounted(() => { /* code */ }) or use defineNuxtPlugin to run only on the client.`,
  });
}

function checkMemberForBrowserGlobal(
  mem: Record<string, unknown>,
  page: ParsedPageScript,
  diags: Diagnostic[],
) {
  const obj = mem.object as Record<string, unknown>;
  if (obj.type !== 'Identifier' || !BROWSER_GLOBALS.has(obj.name as string))
    return;
  diags.push({
    file: page.file,
    line: page.scriptSetupLine,
    column: 1,
    ruleId: 'nuxt-doctor/data-fetching/ssr-safe-onMounted-only-for-client',
    severity: 'warn',
    message: `Browser global "${obj.name}" is accessed at setup top-level outside onMounted. This causes SSR/hydration mismatches. Move browser-only code inside onMounted or a client-only plugin.`,
    source: 'cross-file',
    recommendation: `Wrap "${obj.name}" access in onMounted(() => { /* code */ }) or use defineNuxtPlugin to run only on the client.`,
  });
}
