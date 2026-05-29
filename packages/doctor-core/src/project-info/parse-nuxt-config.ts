import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';

export interface NuxtConfigInfo {
  compatibilityVersion?: number;
  nitroPreset?: string;
  modules?: string[];
  importsAutoImport?: boolean;
}

interface AstNode {
  type: string;
  [key: string]: unknown;
}

const CONFIG_FILES = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];

async function readConfigSource(dir: string): Promise<string | null> {
  for (const name of CONFIG_FILES) {
    try {
      return await readFile(join(dir, name), 'utf8');
    } catch {
      continue;
    }
  }
  return null;
}

function* objectEntries(obj: AstNode): Generator<[string, AstNode]> {
  for (const prop of obj.properties as AstNode[]) {
    if (prop.type !== 'Property') continue;
    const key = prop.key as AstNode;
    if (key.type !== 'Identifier') continue;
    yield [key.name as string, prop.value as AstNode];
  }
}

function findEntry(obj: AstNode, name: string): AstNode | undefined {
  for (const [key, value] of objectEntries(obj)) {
    if (key === name) return value;
  }
  return undefined;
}

function stringLiteral(node: AstNode): string | undefined {
  return node.type === 'Literal' && typeof node.value === 'string'
    ? node.value
    : undefined;
}

function unwrapDefault(decl: AstNode): AstNode | null {
  if (decl.type !== 'CallExpression') return decl;
  const callee = decl.callee as AstNode;
  if (callee.type !== 'Identifier') return null;
  if (callee.name !== 'defineNuxtConfig') return null;
  return (decl.arguments as AstNode[])[0] ?? null;
}

function extractConfigObject(source: string): AstNode | null {
  const result = parseSync('nuxt.config.ts', source, {
    sourceType: 'module',
    lang: 'ts',
  });
  const body = (result.program as unknown as AstNode).body as AstNode[];
  const exported = body.find((n) => n.type === 'ExportDefaultDeclaration');
  if (!exported) return null;
  const node = unwrapDefault(exported.declaration as AstNode);
  if (!node) return null;
  return node.type === 'ObjectExpression' ? node : null;
}

function readNitroPreset(value: AstNode): string | undefined {
  if (value.type !== 'ObjectExpression') return undefined;
  const preset = findEntry(value, 'preset');
  return preset ? stringLiteral(preset) : undefined;
}

function readImportsAutoImport(value: AstNode): boolean | undefined {
  if (value.type !== 'ObjectExpression') return undefined;
  const node = findEntry(value, 'autoImport');
  if (node?.type === 'Literal' && typeof node.value === 'boolean') {
    return node.value;
  }
  return undefined;
}

function readModules(value: AstNode): string[] | undefined {
  if (value.type !== 'ArrayExpression') return undefined;
  const out: string[] = [];
  for (const element of value.elements as (AstNode | null)[]) {
    if (!element) continue;
    const str = stringLiteral(element);
    if (str !== undefined) out.push(str);
  }
  return out;
}

function readCompatibility(value: AstNode): number | undefined {
  return value.type === 'Literal' && typeof value.value === 'number'
    ? value.value
    : undefined;
}

export async function parseNuxtConfig(
  dir: string,
): Promise<NuxtConfigInfo | null> {
  const source = await readConfigSource(dir);
  if (source === null) return null;

  const info: NuxtConfigInfo = {};
  const config = extractConfigObject(source);
  if (!config) return info;

  for (const [key, value] of objectEntries(config)) {
    if (key === 'compatibilityVersion') {
      const compat = readCompatibility(value);
      if (compat !== undefined) info.compatibilityVersion = compat;
    } else if (key === 'nitro') {
      const preset = readNitroPreset(value);
      if (preset !== undefined) info.nitroPreset = preset;
    } else if (key === 'modules') {
      const modules = readModules(value);
      if (modules !== undefined) info.modules = modules;
    } else if (key === 'imports') {
      const autoImport = readImportsAutoImport(value);
      if (autoImport !== undefined) info.importsAutoImport = autoImport;
    }
  }
  return info;
}
