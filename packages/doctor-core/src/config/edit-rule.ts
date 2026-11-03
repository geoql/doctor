import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripJsonComments } from '../build-quality/strip-json-comments.js';
import { pathExists } from '../project-info/path-exists.js';
import { RULE_REGISTRY } from '../rule-registry.js';
import type { Severity } from '../types.js';

export type RuleLevel = Severity | 'off';

const LEVELS: readonly RuleLevel[] = ['error', 'warn', 'info', 'off'];

const SOURCE_CONFIG_FILES = [
  'doctor.config.ts',
  'doctor.config.mts',
  'doctor.config.js',
  'doctor.config.mjs',
];
const JSON_CONFIG_FILES = ['doctor.config.json', 'doctor.config.jsonc'];

export interface SetRuleLevelOptions {
  readonly dir: string;
  readonly ruleId: string;
  readonly level: string;
  /** Plan the edit without writing. */
  readonly dryRun?: boolean;
}

export interface SetRuleLevelResult {
  /** The config file that was (or would be) written. */
  readonly path: string;
  /** True when no config existed and a `doctor.config.json` was created. */
  readonly created: boolean;
  readonly level: RuleLevel;
  readonly content: string;
}

export function isRuleLevel(value: string): value is RuleLevel {
  return (LEVELS as readonly string[]).includes(value);
}

/** The registry default severity for a rule id, or `null` when unknown. */
export function defaultRuleLevel(ruleId: string): Severity | null {
  return RULE_REGISTRY.find((rule) => rule.id === ruleId)?.severity ?? null;
}

interface JsonConfig {
  rules?: Record<string, string>;
  [key: string]: unknown;
}

function withRule(config: JsonConfig, ruleId: string, level: RuleLevel) {
  return { ...config, rules: { ...(config.rules ?? {}), [ruleId]: level } };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Insert or update `rules['<id>']` in a TS/JS config without a full AST
 * round-trip, so comments and formatting survive. Handles the shapes
 * `init` writes (`defineConfig({ ... })`, `export default { ... }`), with
 * or without an existing `rules` block. Returns `null` when the file has a
 * shape it cannot edit safely.
 */
export function upsertRuleInSource(
  source: string,
  ruleId: string,
  level: RuleLevel,
): string | null {
  const entry = `'${ruleId}': '${level}'`;
  const existing = new RegExp(
    `(['"])${escapeRegExp(ruleId)}\\1\\s*:\\s*(['"])(?:error|warn|info|off)\\2`,
  );
  if (existing.test(source)) return source.replace(existing, entry);
  const rulesBlock = /\brules\s*:\s*\{/;
  if (rulesBlock.test(source)) {
    return source.replace(rulesBlock, (match) => `${match}\n    ${entry},`);
  }
  const configObject = /(?:defineConfig\(\s*\{|export\s+default\s*\{)/;
  if (configObject.test(source)) {
    return source.replace(
      configObject,
      (match) => `${match}\n  rules: {\n    ${entry},\n  },`,
    );
  }
  return null;
}

async function firstExisting(
  dir: string,
  names: readonly string[],
): Promise<string | null> {
  for (const name of names) {
    const path = join(dir, name);
    if (await pathExists(path)) return path;
  }
  return null;
}

/**
 * Set a rule's level in the project's doctor config, the way `init` lays it
 * out: an existing `doctor.config.{ts,mts,js,mjs}` is edited in place, a
 * `doctor.config.json{,c}` or `package.json#doctor` is edited as data, and
 * with no config at all a `doctor.config.json` is created. Throws on an
 * unknown rule id or level, or a TS/JS config it cannot edit safely.
 */
export async function setRuleLevel(
  options: SetRuleLevelOptions,
): Promise<SetRuleLevelResult> {
  const { dir, ruleId } = options;
  if (defaultRuleLevel(ruleId) === null) {
    throw new Error(
      `unknown rule '${ruleId}'. Run \`list-rules\` to see registered rules.`,
    );
  }
  if (!isRuleLevel(options.level)) {
    throw new Error(
      `invalid level '${options.level}' (expected: off | info | warn | error)`,
    );
  }
  const level = options.level;

  let path: string;
  let content: string;
  let created = false;

  const sourcePath = await firstExisting(dir, SOURCE_CONFIG_FILES);
  const jsonPath = await firstExisting(dir, JSON_CONFIG_FILES);
  const packageJsonPath = join(dir, 'package.json');
  const pkg = (await pathExists(packageJsonPath))
    ? (JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        doctor?: JsonConfig;
        [key: string]: unknown;
      })
    : null;

  if (sourcePath) {
    path = sourcePath;
    const edited = upsertRuleInSource(
      await readFile(sourcePath, 'utf8'),
      ruleId,
      level,
    );
    if (edited === null) {
      throw new Error(
        `cannot edit ${sourcePath} automatically; add \`rules: { '${ruleId}': '${level}' }\` to it by hand.`,
      );
    }
    content = edited;
  } else if (jsonPath) {
    path = jsonPath;
    const config = JSON.parse(
      stripJsonComments(await readFile(jsonPath, 'utf8')),
    ) as JsonConfig;
    content = `${JSON.stringify(withRule(config, ruleId, level), null, 2)}\n`;
  } else if (pkg?.doctor !== undefined) {
    path = packageJsonPath;
    content = `${JSON.stringify({ ...pkg, doctor: withRule(pkg.doctor, ruleId, level) }, null, 2)}\n`;
  } else {
    path = join(dir, 'doctor.config.json');
    created = true;
    content = `${JSON.stringify(withRule({}, ruleId, level), null, 2)}\n`;
  }

  if (!options.dryRun) await writeFile(path, content, 'utf8');
  return { path, created, level, content };
}
