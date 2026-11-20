import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import { parseSync } from 'oxc-parser';
import { parseNoindexRoutePatterns } from '../project-info/parse-nuxt-config.js';

type Program = ReturnType<typeof parseSync>['program'];
type Statement = Program['body'][number];
type CallExpr = Extract<
  Extract<Statement, { type: 'ExpressionStatement' }>['expression'],
  { type: 'CallExpression' }
>;
type ObjectExpr = Extract<
  CallExpr['arguments'][number],
  { type: 'ObjectExpression' }
>;
type Value = ObjectExpr['properties'][number] extends infer P
  ? P extends { type: 'Property'; value: infer V }
    ? V
    : never
  : never;

export interface PageIndexabilityInput {
  /** Parsed `<script setup>` of the page. */
  program: Program;
  /** Page path relative to the project root, e.g. `app/pages/admin.vue`. */
  relativePath: string;
  rootDirectory: string;
  nuxtConfigPath: string | null;
}

interface PageMeta {
  layout: string | false;
  middleware: string[];
}

const PAGE_PREFIX = /^(?:app\/)?pages\//;
const AUTH_TOKENS = new Set(['auth', 'authenticated', 'authed', 'protected']);

function isNoindex(value: string): boolean {
  return /\b(?:noindex|none)\b/i.test(value);
}

interface NamedCall {
  name: string;
  call: CallExpr;
}

function topLevelCalls(program: Program): NamedCall[] {
  const calls: NamedCall[] = [];
  for (const stmt of program.body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    const expr = stmt.expression;
    if (expr.type !== 'CallExpression') continue;
    if (expr.callee.type !== 'Identifier') continue;
    calls.push({ name: expr.callee.name, call: expr });
  }
  return calls;
}

function firstObjectArg(call: CallExpr): ObjectExpr | null {
  const arg = call.arguments[0];
  return arg?.type === 'ObjectExpression' ? arg : null;
}

function entries(obj: ObjectExpr): [string, Value][] {
  const out: [string, Value][] = [];
  for (const prop of obj.properties) {
    if (prop.type !== 'Property') continue;
    const key = prop.key;
    if (key.type === 'Identifier') out.push([key.name, prop.value]);
    else if (key.type === 'Literal' && typeof key.value === 'string')
      out.push([key.value, prop.value]);
  }
  return out;
}

function entry(obj: ObjectExpr, name: string): Value | undefined {
  return entries(obj).find(([key]) => key === name)?.[1];
}

function stringValue(value: Value | undefined): string | undefined {
  return value?.type === 'Literal' && typeof value.value === 'string'
    ? value.value
    : undefined;
}

function robotsValueIsNoindex(value: Value | undefined): boolean {
  const str = stringValue(value);
  if (str !== undefined) return isNoindex(str);
  if (value?.type !== 'ObjectExpression') return false;
  const flag = entry(value, 'noindex');
  return flag?.type === 'Literal' && flag.value === true;
}

function headMetaIsNoindex(meta: Value | undefined): boolean {
  if (meta?.type !== 'ArrayExpression') return false;
  for (const element of meta.elements) {
    if (element?.type !== 'ObjectExpression') continue;
    if (stringValue(entry(element, 'name'))?.toLowerCase() !== 'robots')
      continue;
    const content = stringValue(entry(element, 'content'));
    if (content !== undefined && isNoindex(content)) return true;
  }
  return false;
}

/**
 * True when a top-level `useSeoMeta` / `useHead` call in the script keeps the
 * page out of search indexes (`robots: 'noindex'`, `robots: { noindex: true }`
 * or a `<meta name="robots" content="noindex">` entry).
 */
export function scriptSetsNoindex(program: Program): boolean {
  for (const { name, call } of topLevelCalls(program)) {
    const arg = firstObjectArg(call);
    if (!arg) continue;
    if (name === 'useSeoMeta' && robotsValueIsNoindex(entry(arg, 'robots')))
      return true;
    if (name === 'useHead' && headMetaIsNoindex(entry(arg, 'meta')))
      return true;
  }
  return false;
}

function readPageMeta(program: Program): PageMeta {
  const meta: PageMeta = { layout: 'default', middleware: [] };
  const found = topLevelCalls(program).find((c) => c.name === 'definePageMeta');
  const arg = found ? firstObjectArg(found.call) : null;
  if (!arg) return meta;
  const layout = entry(arg, 'layout');
  if (layout?.type === 'Literal' && layout.value === false) meta.layout = false;
  const layoutName = stringValue(layout);
  if (layoutName !== undefined) meta.layout = layoutName;
  const middleware = entry(arg, 'middleware');
  const single = stringValue(middleware);
  if (single !== undefined) meta.middleware.push(single);
  if (middleware?.type === 'ArrayExpression') {
    for (const element of middleware.elements) {
      if (element?.type === 'Literal' && typeof element.value === 'string')
        meta.middleware.push(element.value);
    }
  }
  return meta;
}

function isAuthMiddleware(name: string): boolean {
  return name
    .toLowerCase()
    .split(/[-_.:]/)
    .some((token) => AUTH_TOKENS.has(token));
}

function layoutSetsNoindex(
  input: PageIndexabilityInput,
  layout: string,
): boolean {
  const prefix = input.relativePath.startsWith('app/') ? 'app/' : '';
  const path = join(input.rootDirectory, `${prefix}layouts`, `${layout}.vue`);
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    return false;
  }
  const scriptSetup = parse(source, { filename: path }).descriptor.scriptSetup;
  if (!scriptSetup) return false;
  const lang = scriptSetup.lang === 'ts' ? 'ts' : 'js';
  const { program } = parseSync(`layout.${lang}`, scriptSetup.content, {
    sourceType: 'module',
    lang,
  });
  return scriptSetsNoindex(program);
}

/** `app/pages/admin/[id]/index.vue` → `/admin/[id]`. */
export function pageRoutePath(relativePath: string): string {
  const segments = relativePath
    .replace(/\\/g, '/')
    .replace(PAGE_PREFIX, '')
    .replace(/\.vue$/, '')
    .split('/')
    .filter((seg) => !/^\(.*\)$/.test(seg));
  if (segments.at(-1) === 'index') segments.pop();
  return `/${segments.join('/')}`;
}

/**
 * Nitro-style route-rule match: `/x/**` covers `/x` and everything below it;
 * otherwise segments match exactly, with `*` / `:param` matching one segment.
 */
export function routeMatches(pattern: string, route: string): boolean {
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3);
    return base === '' || route === base || route.startsWith(`${base}/`);
  }
  const want = pattern.split('/');
  const have = route.split('/');
  if (want.length !== have.length) return false;
  return want.every(
    (seg, i) => seg === '*' || seg.startsWith(':') || seg === have[i],
  );
}

function routeRulesSetNoindex(input: PageIndexabilityInput): boolean {
  if (input.nuxtConfigPath === null) return false;
  let source: string;
  try {
    source = readFileSync(input.nuxtConfigPath, 'utf8');
  } catch {
    return false;
  }
  const route = pageRoutePath(input.relativePath);
  return parseNoindexRoutePatterns(source).some((pattern) =>
    routeMatches(pattern, route),
  );
}

/**
 * True when a Nuxt page is deliberately kept out of search results: the page
 * or its layout sets `noindex`, a matching `routeRules` entry disables robots,
 * or the page sits behind an auth middleware. Social-card / indexing SEO
 * rules skip such pages.
 */
export function isNonIndexablePage(input: PageIndexabilityInput): boolean {
  if (scriptSetsNoindex(input.program)) return true;
  const meta = readPageMeta(input.program);
  if (meta.middleware.some(isAuthMiddleware)) return true;
  if (meta.layout !== false && layoutSetsNoindex(input, meta.layout))
    return true;
  return routeRulesSetNoindex(input);
}
