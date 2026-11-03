const KEBAB_FLAG = /^--([a-z0-9]+(?:-[a-z0-9]+)+)(=.*)?$/;

/**
 * Rewrite `--kebab-case` flags to `--kebabCase` before cac parses argv.
 *
 * cac registers boolean options under their camelCase name, but its mri
 * parser sees the raw `--dry-run` token, does not recognise it as boolean,
 * and swallows the next positional as the flag's value
 * (`install --dry-run ./app` lost `./app`). The camelCase spelling is the
 * one cac stores, so mri then treats it as boolean and value-taking flags
 * keep working. `--no-*` negations and everything after `--` are untouched.
 */
export function normalizeCliArgv(argv: readonly string[]): string[] {
  const out: string[] = [];
  let passthrough = false;
  for (const token of argv) {
    if (passthrough || token === '--') {
      passthrough = true;
      out.push(token);
      continue;
    }
    const match = KEBAB_FLAG.exec(token);
    if (!match || token.startsWith('--no-')) {
      out.push(token);
      continue;
    }
    const camel = match[1].replace(/-([a-z0-9])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    out.push(`--${camel}${match[2] ?? ''}`);
  }
  return out;
}
