import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/security/no-secret-in-public-runtime-config';

const SECRET_KEY =
  /secret|password|passwd|token|jwt|api[-_]?key|private[-_]?key|bearer|credential/i;

const CONFIG_FILES = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];

interface AstNode {
  type: string;
  [key: string]: unknown;
}

function offsetToPosition(
  source: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

async function readConfigSource(
  dir: string,
): Promise<{ source: string; file: string } | null> {
  for (const name of CONFIG_FILES) {
    try {
      const file = join(dir, name);
      return { source: await readFile(file, 'utf8'), file };
    } catch {
      continue;
    }
  }
  return null;
}

function* objectEntries(obj: AstNode): Generator<[string, AstNode, AstNode]> {
  for (const prop of obj.properties as AstNode[]) {
    if (prop.type !== 'Property') continue;
    const key = prop.key as AstNode;
    if (key.type !== 'Identifier') continue;
    yield [key.name as string, prop.value as AstNode, key];
  }
}

function findEntry(obj: AstNode, name: string): AstNode | undefined {
  for (const [key, value] of objectEntries(obj)) {
    if (key === name) return value;
  }
  return undefined;
}

function extractConfigObject(source: string): AstNode | null {
  const result = parseSync('nuxt.config.ts', source, {
    sourceType: 'module',
    lang: 'ts',
  });
  const body = (result.program as unknown as AstNode).body as AstNode[];
  const exported = body.find((n) => n.type === 'ExportDefaultDeclaration');
  if (!exported) return null;
  const decl = exported.declaration as AstNode;
  if (decl.type === 'ObjectExpression') return decl;
  if (decl.type !== 'CallExpression') return null;
  const callee = decl.callee as AstNode;
  if (callee.type !== 'Identifier' || callee.name !== 'defineNuxtConfig') {
    return null;
  }
  const arg = (decl.arguments as AstNode[])[0];
  return arg?.type === 'ObjectExpression' ? arg : null;
}

export async function checkNoSecretInPublicRuntimeConfig(
  projectInfo: ProjectInfo,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const config = await readConfigSource(projectInfo.rootDirectory);
  if (config === null) return [];

  const root = extractConfigObject(config.source);
  if (!root) return [];

  const runtimeConfig = findEntry(root, 'runtimeConfig');
  if (runtimeConfig?.type !== 'ObjectExpression') return [];

  const publicBlock = findEntry(runtimeConfig, 'public');
  if (publicBlock?.type !== 'ObjectExpression') return [];

  const issues: NuxtPostCheckIssue[] = [];
  for (const [name, , keyNode] of objectEntries(publicBlock)) {
    if (!SECRET_KEY.test(name)) continue;
    const offset = keyNode.start as number;
    const position = offsetToPosition(config.source, offset);
    issues.push({
      ruleId: RULE_ID,
      file: config.file,
      line: position.line,
      column: position.column,
      severity: 'error',
      message: `runtimeConfig.public.${name} is serialized to the client bundle, exposing the secret. Move it to the private root of runtimeConfig.`,
      recommendation: `Move ${name} out of runtimeConfig.public to the top level of runtimeConfig so it stays server-only.`,
    });
  }
  return issues;
}
