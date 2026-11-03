import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';

// Build-time Vite plugins resolve files and packages that no source file
// imports. Their generated `.d.ts` manifests are often gitignored, so the
// plugin options in vite.config are the only static record of what they
// resolve. See issue #85.
export interface ViteAutoResolve {
  entryDirs: string[];
  packages: string[];
}

interface AstNode {
  type: string;
  [key: string]: unknown;
}

type PluginKind = 'autoImport' | 'components' | 'router' | 'pages' | 'layouts';

const CONFIG_FILES = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.js',
  'vite.config.mjs',
];

const PLUGIN_MODULES = new Map<string, PluginKind>([
  ['unplugin-auto-import/vite', 'autoImport'],
  ['unplugin-vue-components/vite', 'components'],
  ['unplugin-vue-router/vite', 'router'],
  ['vue-router/vite', 'router'],
  ['vite-plugin-pages', 'pages'],
  ['vite-plugin-vue-layouts', 'layouts'],
  ['vite-plugin-vue-layouts-next', 'layouts'],
]);

// Option key holding the scanned dirs, and the plugin's default when omitted.
const DIR_OPTIONS: Record<
  PluginKind,
  { key: string; srcKey?: string; defaults: string[] }
> = {
  autoImport: { key: 'dirs', defaults: [] },
  components: { key: 'dirs', defaults: ['src/components'] },
  router: { key: 'routesFolder', srcKey: 'src', defaults: ['src/pages'] },
  pages: { key: 'dirs', srcKey: 'dir', defaults: ['src/pages'] },
  layouts: { key: 'layoutsDirs', defaults: ['src/layouts'] },
};

const ENTRY_EXTENSIONS = '{ts,tsx,js,jsx,mts,mjs,vue}';

function isNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AstNode).type === 'string'
  );
}

function* walk(node: AstNode): Generator<AstNode> {
  yield node;
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (isNode(child)) yield* walk(child);
    }
  }
}

function stringValue(node: AstNode): string | undefined {
  return node.type === 'Literal' && typeof node.value === 'string'
    ? node.value
    : undefined;
}

function propertyKey(prop: AstNode): string | undefined {
  const key = prop.key as AstNode;
  return key.type === 'Identifier' ? (key.name as string) : stringValue(key);
}

function findOption(options: AstNode, name: string): AstNode | undefined {
  for (const prop of options.properties as AstNode[]) {
    if (prop.type === 'Property' && propertyKey(prop) === name) {
      return prop.value as AstNode;
    }
  }
  return undefined;
}

function readDirs(value: AstNode, srcKey: string | undefined): string[] {
  const items =
    value.type === 'ArrayExpression'
      ? (value.elements as (AstNode | null)[])
      : [value];
  const dirs: string[] = [];
  for (const item of items) {
    if (!item) continue;
    const src =
      srcKey && item.type === 'ObjectExpression'
        ? findOption(item, srcKey)
        : item;
    const dir = src ? stringValue(src) : undefined;
    if (dir !== undefined) dirs.push(dir);
  }
  return dirs;
}

function packageName(specifier: string): string | null {
  if (/^[./~#]|^@\//.test(specifier)) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : (parts[0] as string);
}

function readImportPackages(value: AstNode): string[] {
  if (value.type !== 'ArrayExpression') return [];
  const specifiers: string[] = [];
  for (const item of value.elements as (AstNode | null)[]) {
    if (!item) continue;
    if (item.type === 'Identifier' && item.name === 'VueRouterAutoImports') {
      specifiers.push('vue-router');
    } else if (item.type === 'ObjectExpression') {
      for (const prop of item.properties as AstNode[]) {
        const key = prop.type === 'Property' ? propertyKey(prop) : undefined;
        if (key !== undefined) specifiers.push(key);
      }
    } else {
      const preset = stringValue(item);
      if (preset !== undefined) specifiers.push(preset);
    }
  }
  return specifiers
    .map(packageName)
    .filter((name): name is string => name !== null);
}

export function toEntryGlob(dir: string): string {
  const trimmed = dir.replace(/^\.\//, '').replace(/\/+$/, '');
  const lastSegment = trimmed.split('/').pop() as string;
  if (lastSegment.includes('.')) return trimmed;
  return `${trimmed.replace(/\/\*\*?$/, '')}/**/*.${ENTRY_EXTENSIONS}`;
}

function collectPluginImports(program: AstNode): Map<string, PluginKind> {
  const locals = new Map<string, PluginKind>();
  for (const statement of program.body as AstNode[]) {
    if (statement.type !== 'ImportDeclaration') continue;
    const kind = PLUGIN_MODULES.get(
      (statement.source as AstNode).value as string,
    );
    if (!kind) continue;
    for (const specifier of statement.specifiers as AstNode[]) {
      const local = specifier.local as AstNode;
      locals.set(local.name as string, kind);
    }
  }
  return locals;
}

export function analyzeViteConfig(source: string): ViteAutoResolve {
  const result = parseSync('vite.config.ts', source, {
    sourceType: 'module',
    lang: 'ts',
  });
  const program = result.program as unknown as AstNode;
  const locals = collectPluginImports(program);

  const entryDirs = new Set<string>();
  const packages = new Set<string>();
  if (locals.size === 0) return { entryDirs: [], packages: [] };

  for (const node of walk(program)) {
    if (node.type !== 'CallExpression') continue;
    const callee = node.callee as AstNode;
    if (callee.type !== 'Identifier') continue;
    const kind = locals.get(callee.name as string);
    if (!kind) continue;

    const arg = (node.arguments as AstNode[])[0];
    const options = arg?.type === 'ObjectExpression' ? arg : undefined;
    const { key, srcKey, defaults } = DIR_OPTIONS[kind];
    const dirsNode = options ? findOption(options, key) : undefined;
    for (const dir of dirsNode ? readDirs(dirsNode, srcKey) : defaults) {
      if (!dir.startsWith('!')) entryDirs.add(toEntryGlob(dir));
    }

    const importsNode =
      kind === 'autoImport' && options
        ? findOption(options, 'imports')
        : undefined;
    if (importsNode) {
      for (const name of readImportPackages(importsNode)) packages.add(name);
    }
  }

  return { entryDirs: [...entryDirs], packages: [...packages] };
}

export async function parseViteAutoResolve(
  rootDirectory: string,
): Promise<ViteAutoResolve> {
  for (const name of CONFIG_FILES) {
    let source: string;
    try {
      source = await readFile(join(rootDirectory, name), 'utf8');
    } catch {
      continue;
    }
    return analyzeViteConfig(source);
  }
  return { entryDirs: [], packages: [] };
}
