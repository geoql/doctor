import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, posix } from 'node:path';

// Files a Nuxt module loads by name: nothing imports them, so knip sees them
// as unused unless they are declared as entries (issue #322).
const MODULE_CONVENTION_FILES: Record<string, string[]> = {
  '@nuxt/content': ['content.config.{ts,js,mjs}'],
};

/** Convention-file entry globs for the modules listed in `dependencies`. */
export function moduleConventionEntries(
  dependencies: Record<string, string>,
): string[] {
  return Object.entries(MODULE_CONVENTION_FILES).flatMap(([module, files]) =>
    module in dependencies ? files : [],
  );
}

const CONFIG_EXTS = ['', '.json', '.yml', '.yaml', '.toml'];
const SCRIPT_EXTS = ['.js', '.cjs', '.mjs', '.ts'];

// Git-hook and pre-commit configs whose commands run local scripts. knip's
// own hook plugins either need the tool installed or resolve `node <file>`
// relative to the hook file's directory, while hooks run from the repo root.
const HOOK_CONFIG_FILES = [
  ...['lefthook', '.lefthook', '.config/lefthook', 'lefthook-local'].flatMap(
    (base) => CONFIG_EXTS.slice(1).map((ext) => `${base}${ext}`),
  ),
  ...['.simple-git-hooks', 'simple-git-hooks'].flatMap((base) =>
    ['.json', ...SCRIPT_EXTS].map((ext) => `${base}${ext}`),
  ),
  ...CONFIG_EXTS.concat(SCRIPT_EXTS).map((ext) => `.lintstagedrc${ext}`),
  ...SCRIPT_EXTS.map((ext) => `lint-staged.config${ext}`),
];

const PACKAGE_JSON_HOOK_FIELDS = ['simple-git-hooks', 'lint-staged', 'husky'];

const SCRIPT_TOKEN = /^[\w./@-]+\.(?:[cm]?[jt]s|[jt]sx)$/;

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function huskyHookSources(rootDirectory: string): Promise<string[]> {
  const dir = join(rootDirectory, '.husky');
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const sources: string[] = [];
  for (const name of names) {
    // Directories (husky's own `_/` helpers) fail to read and are skipped.
    const text = await readText(join(dir, name));
    if (text !== null) sources.push(text);
  }
  return sources;
}

async function packageJsonHookSources(
  rootDirectory: string,
): Promise<string[]> {
  const raw = await readText(join(rootDirectory, 'package.json'));
  if (raw === null) return [];
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return [];
  }
  return PACKAGE_JSON_HOOK_FIELDS.filter((field) => field in manifest).map(
    (field) => JSON.stringify(manifest[field]),
  );
}

function scriptPaths(source: string): string[] {
  return source
    .split(/[\s'"`;,()[\]{}=]+/)
    .filter((token) => SCRIPT_TOKEN.test(token))
    .filter((token) => !isAbsolute(token))
    .map((token) => posix.normalize(token))
    .filter((path) => !path.startsWith('../'));
}

/**
 * Project-relative paths of local scripts that git hooks (husky, lefthook,
 * simple-git-hooks) and lint-staged run. They have no importer, so they must
 * be knip entries or `dead-code/unused-file` reports them (issue #322).
 */
export async function hookScriptEntries(
  rootDirectory: string,
): Promise<string[]> {
  const sources = [
    ...(await huskyHookSources(rootDirectory)),
    ...(await packageJsonHookSources(rootDirectory)),
  ];
  for (const file of HOOK_CONFIG_FILES) {
    const text = await readText(join(rootDirectory, file));
    if (text !== null) sources.push(text);
  }
  const entries = new Set<string>();
  for (const path of sources.flatMap(scriptPaths)) {
    if (await isFile(join(rootDirectory, path))) entries.add(path);
  }
  return [...entries];
}
