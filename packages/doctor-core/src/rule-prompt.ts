import { loadAllRuleDocs, loadRuleDoc } from './rule-docs.js';
import type { RuleDoc } from './rule-docs.js';

// Which published CLI owns a given rule id. Nuxt rules ship in @geoql/nuxt-doctor
// (which bundles the Vue passes too); everything else is audited by
// @geoql/vue-doctor. Kept co-located (Rule #9) — single-use mapping for prompts.
type DoctorCli = '@geoql/vue-doctor' | '@geoql/nuxt-doctor';

function cliForRule(ruleId: string): DoctorCli {
  return ruleId.startsWith('nuxt-doctor/')
    ? '@geoql/nuxt-doctor'
    : '@geoql/vue-doctor';
}

function presetLine(doc: RuleDoc): string {
  return doc.recommended
    ? 'This rule is part of the `recommended` preset, so it runs by default.'
    : 'This rule is off by default in `recommended`; enable it with `--rule ' +
        `${doc.id}:warn\` or in \`doctor.config.ts\`.`;
}

function article(word: string): 'a' | 'an' {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function whyThisMatters(doc: RuleDoc): string {
  const severityNote =
    doc.severity === 'error'
      ? 'It is an `error`-severity rule: a finding is a correctness, security, or hard-correctness defect that should block a clean audit.'
      : doc.severity === 'warn'
        ? 'It is a `warn`-severity rule: a finding is a likely bug, performance trap, or AI-slop pattern worth fixing before shipping.'
        : 'It is an `info`-severity rule: a finding is an opt-in suggestion that nudges the code toward the idiomatic Vue 3 / Nuxt 4 pattern.';
  return `\`${doc.id}\` is ${article(doc.severity)} ${doc.severity}-severity ${doc.category} rule from ${doc.source}. ${severityNote}\n\n${presetLine(doc)}`;
}

function howToFix(doc: RuleDoc, cli: DoctorCli): string {
  return [
    `Open each file the audit flags for \`${doc.id}\` and edit the offending code in the working tree directly.`,
    '',
    `1. Read the canonical rule reference at ${doc.helpUri} for the full rationale and the idiomatic ${doc.category} pattern.`,
    `2. Apply the smallest change that resolves the ${doc.category} concern without altering unrelated behavior — do not suppress the finding with an inline disable unless the rule is a genuine false positive for that line.`,
    `3. Run \`npx ${cli} explain ${doc.id}\` for an inline summary of the severity, category, and help link while you work.`,
    '',
    'Fix by severity: resolve `error` findings first, then `warn`, then `info`.',
  ].join('\n');
}

function howToValidate(doc: RuleDoc, cli: DoctorCli): string {
  return [
    'Re-run the audit scoped to just this rule and confirm it reports zero findings:',
    '',
    '```bash',
    `npx ${cli} --rule ${doc.id}:error --full`,
    '```',
    '',
    `A clean run (no diagnostics for \`${doc.id}\`) means the fix is complete. If findings remain, repeat the "How to fix" steps on the still-flagged files.`,
  ].join('\n');
}

/**
 * Render a self-contained "fix + validate" markdown recipe for a single rule.
 * Returns `null` for an unknown rule id. Pure: derives everything from the
 * rule's `RuleDoc` (id, severity, category, source, recommended, helpUri).
 */
export function renderRulePrompt(ruleId: string): string | null {
  const doc = loadRuleDoc(ruleId);
  if (!doc) return null;
  const cli = cliForRule(doc.id);
  return [
    `# Fix: \`${doc.id}\``,
    '',
    `> **Rule** \`${doc.id}\` · **Severity** \`${doc.severity}\` · **Category** \`${doc.category}\` · **Source** \`${doc.source}\``,
    '',
    '## Why this matters',
    '',
    whyThisMatters(doc),
    '',
    '## How to fix',
    '',
    howToFix(doc, cli),
    '',
    '## How to validate',
    '',
    howToValidate(doc, cli),
    '',
    '## Reference',
    '',
    `Canonical rule documentation: ${doc.helpUri}`,
    '',
  ].join('\n');
}

/**
 * Render the canonical agent playbook: the scan → filter → triage → fix →
 * validate loop an AI agent follows when cleaning up doctor diagnostics. Pure
 * markdown; fetched on demand by the agent skill at runtime.
 */
export function renderAgentPlaybook(): string {
  const ruleCount = loadAllRuleDocs().length;
  return [
    '# Doctor Agent Playbook',
    '',
    'You are an AI agent cleaning up `@geoql/doctor` findings in a Vue 3 / Nuxt 4',
    'codebase. Doctor does not generate code — it critiques the code you just',
    'wrote. Follow this loop exactly.',
    '',
    '## Guardrails',
    '',
    '- Edit the working tree directly to fix findings.',
    '- **NEVER commit.** Leave staging and committing to the human.',
    '- **NEVER open a pull request**, push a branch, or run any git write command.',
    '- Never weaken a rule to make a finding disappear; fix the underlying code.',
    '',
    '## Pick the right CLI',
    '',
    'Use `npx @geoql/nuxt-doctor` for a Nuxt 4 project (it runs the Vue passes',
    'too) and `npx @geoql/vue-doctor` for a standalone Vue 3 project. The flags',
    `below are identical for both. Doctor ships ~${ruleCount} rules across the vue,`,
    'nuxt, and oxlint-builtin plugins.',
    '',
    '## The loop',
    '',
    '### 1. Scan',
    '',
    'Audit only what changed so you stay focused on your own edits:',
    '',
    '```bash',
    'npx @geoql/vue-doctor --diff      # findings in files changed vs HEAD',
    'npx @geoql/vue-doctor --staged    # findings in staged files only',
    'npx @geoql/vue-doctor --full      # complete scan (overrides --diff/--staged)',
    '```',
    '',
    'For a quick health gate, read just the score:',
    '',
    '```bash',
    'npx @geoql/vue-doctor --score     # prints a single 0-100 integer',
    '```',
    '',
    '### 2. Filter',
    '',
    'Get the machine-readable report and work from it:',
    '',
    '```bash',
    'npx @geoql/vue-doctor --diff --json',
    '```',
    '',
    'Group the diagnostics by `ruleId`. Drop nothing — every finding is in scope',
    'unless the human told you otherwise.',
    '',
    '### 3. Triage',
    '',
    'Order the work by severity: `error` first, then `warn`, then `info`. To',
    'understand a single rule before touching code:',
    '',
    '```bash',
    'npx @geoql/vue-doctor explain <rule>     # severity, category, help link',
    'npx @geoql/vue-doctor list-rules         # every registered rule (alias: rules)',
    '```',
    '',
    '### 4. Fix',
    '',
    'For each rule with findings, fetch the canonical per-rule recipe and apply',
    'it to every flagged file:',
    '',
    '```bash',
    'curl --fail --silent --show-error \\',
    '  https://docs.the-doctor.report/prompts/rules/<plugin>/<rule>.md',
    '```',
    '',
    'For example, `vue-doctor/template/v-for-has-key` lives at',
    '`/prompts/rules/vue-doctor/template/v-for-has-key.md`. Each recipe explains',
    'why the rule matters, how to fix it, and how to validate the fix. Edit the',
    'working tree directly — never an inline disable unless it is a true false',
    'positive.',
    '',
    '### 5. Validate',
    '',
    'After fixing a rule, re-run the audit scoped to just that rule and confirm',
    'zero findings:',
    '',
    '```bash',
    'npx @geoql/vue-doctor --rule <rule>:error --full',
    '```',
    '',
    'Then re-run the full scan and confirm the score did not regress:',
    '',
    '```bash',
    'npx @geoql/vue-doctor --full --score',
    '```',
    '',
    'Repeat the loop until the score is clean. Hand the working tree back to the',
    'human to review and commit.',
    '',
  ].join('\n');
}
