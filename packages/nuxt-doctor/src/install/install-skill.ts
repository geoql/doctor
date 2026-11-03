import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { planAgentHooks, writeAgentHooks } from '@geoql/doctor-core';
import prompts from 'prompts';

interface InstallSkillOptions {
  dir: string;
  version: string;
  yes?: boolean;
  dryRun?: boolean;
  force?: boolean;
  agentHooks?: boolean;
}

const PLUGIN = 'nuxt-doctor';
const PACKAGE = '@geoql/nuxt-doctor';
const FRAMEWORK = 'Nuxt';
const PLAYBOOK_URL = 'https://docs.the-doctor.report/prompts/doctor-agent.md';
const RULES_URL_BASE =
  'https://docs.the-doctor.report/prompts/rules/nuxt-doctor/';

export function buildSkillMarkdown(version: string): string {
  return `---
name: ${PLUGIN}
description: Use when finishing a feature, fixing a bug, before committing ${FRAMEWORK} code, or when the user types \`/doctor\`, asks to scan, triage, or clean up ${FRAMEWORK} diagnostics. Covers hydration traps, server-route mistakes, data fetching, performance, and AI-slop. Includes a regression check and a full local-triage workflow that fetches the canonical playbook.
version: "${version}"
---

# ${FRAMEWORK} Doctor

Audits ${FRAMEWORK} 4 codebases for hydration traps, server-route mistakes, data-fetching errors, performance traps, and AI-agent anti-patterns. Outputs a 0–100 health score.

## After making ${FRAMEWORK} code changes:

Run \`npx ${PACKAGE}@latest --diff --verbose\` and check the score did not regress. \`--diff\` reports only issues introduced versus the base branch.

If the score dropped, fix the regressions before committing.

## For general cleanup or code improvement:

Run \`npx ${PACKAGE}@latest --verbose\` to scan the full codebase. Fix issues by severity — errors first, then warnings.

## /doctor — full local triage workflow

When the user types \`/doctor\`, says "run ${PLUGIN}", or asks for a full triage / cleanup pass (not just a regression check), fetch the canonical local-triage playbook and follow every step in it:

\`\`\`bash
curl --fail --silent --show-error \\
  --header 'Cache-Control: no-cache' \\
  ${PLAYBOOK_URL}
\`\`\`

The playbook is the single source of truth — a scan → filter → triage → fix → validate loop that edits the working tree directly (never commits, never opens PRs). Updating the prompt at its source updates every agent on its next fetch — no skill reinstall needed.

Pair it with the matching per-rule prompts at \`${RULES_URL_BASE}<rule>.md\` (fetched on demand inside the playbook) so each fix uses the canonical, reviewer-tested recipe.

## Configuring or explaining rules

When the user wants to understand a rule, disagrees with one, or wants to tune which rules run (not fix code), start with \`npx ${PACKAGE}@latest explain <rule>\` (alias \`why\`), then list everything with \`npx ${PACKAGE}@latest list-rules\` (alias \`rules\`; filter with \`--tag <tag>\`). Change a rule with \`npx ${PACKAGE}@latest rules set <rule> <off|info|warn|error>\` (or \`rules disable <rule>\` / \`rules enable <rule>\`). Pick the narrowest control: a rule level, then \`ignore.tags\` / \`ignore.overrides\`, then \`surfaces\` to hide a finding from only the score, PR comment, or CI gate.

## Command

\`\`\`bash
npx ${PACKAGE}@latest --diff --verbose
\`\`\`

| Flag        | Purpose                                                          |
| ----------- | --------------------------------------------------------------- |
| \`.\`         | Scan current directory                                          |
| \`--verbose\` | Show affected files and line numbers per rule                   |
| \`--diff\`    | Only report issues introduced vs the base branch (default: full)|
| \`--score\`   | Output only the numeric score                                  |
| \`--json\`    | Emit machine-readable JSON                                     |
`;
}

export async function runInstallSkill(
  options: InstallSkillOptions,
): Promise<void> {
  const targetDir = resolve(options.dir);
  const skillDir = join(targetDir, '.agents', 'skills', PLUGIN);
  const skillPath = join(skillDir, 'SKILL.md');
  const content = buildSkillMarkdown(options.version);
  const hookWrites = options.agentHooks
    ? planAgentHooks({ projectRoot: targetDir, bin: PLUGIN })
    : [];

  if (options.dryRun) {
    process.stdout.write(`[dry-run] would write ${skillPath}\n`);
    process.stdout.write(`${content}\n`);
    for (const write of hookWrites) {
      process.stdout.write(`[dry-run] would write ${write.path}\n`);
    }
    process.exitCode = 0;
    return;
  }

  // With --agent-hooks a re-run stays idempotent: keep the existing skill
  // and (re)install only the hooks.
  const skillExists = existsSync(skillPath) && !options.force;
  if (skillExists && !options.agentHooks) {
    process.stderr.write(
      `${PLUGIN} install: ${skillPath} already exists. Run with --force to overwrite.\n`,
    );
    process.exitCode = 2;
    return;
  }

  if (!options.yes) {
    const answers = await prompts(
      {
        type: 'confirm',
        name: 'confirm',
        message: options.agentHooks
          ? `Scaffold the ${PLUGIN} agent skill and Claude Code / Cursor end-of-turn hooks in ${targetDir}?`
          : `Scaffold the ${PLUGIN} agent skill at ${skillPath}?`,
        initial: true,
      },
      {
        onCancel: () => {
          process.exitCode = 2;
        },
      },
    );
    if (process.exitCode === 2) return;
    if (!answers.confirm) {
      process.stdout.write(`${PLUGIN} install: cancelled\n`);
      process.exitCode = 0;
      return;
    }
  }

  if (skillExists) {
    process.stdout.write(`${PLUGIN} install: kept existing ${skillPath}\n`);
  } else {
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(skillPath, content, 'utf8');
    process.stdout.write(`${PLUGIN} install: wrote ${skillPath}\n`);
  }

  const claudePath = join(targetDir, '.claude');
  if (!existsSync(claudePath)) {
    symlinkSync('.agents', claudePath);
    process.stdout.write(`${PLUGIN} install: linked .claude -> .agents\n`);
  }

  writeAgentHooks(hookWrites);
  for (const write of hookWrites) {
    process.stdout.write(`${PLUGIN} install: wrote ${write.path}\n`);
  }

  process.exitCode = 0;
}
