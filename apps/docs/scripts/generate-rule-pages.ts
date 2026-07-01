#!/usr/bin/env node
// Codegen: emits one Markdown file per rule in @geoql/doctor-core's
// RULE_REGISTRY, routed under apps/docs/content/2.rules/<slash-path>.md.
//
// The doctor registry is the single source of truth — these pages are
// regenerated on every `predev` / `prebuild`, so drift between the
// catalogue and the docs is impossible. Pages are gitignored and only
// exist on disk while the dev server / build is running.
//
// Run via: `pnpm --filter @geoql/doctor-docs generate:rules` (or implicitly
// via `predev` / `prebuild`).

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RULE_REGISTRY, loadRuleDoc } from '@geoql/doctor-core';

const here = dirname(fileURLToPath(import.meta.url));
// apps/docs/scripts → apps/docs
const appsDocsRoot = resolve(here, '..');
const rulesDir = join(appsDocsRoot, 'content', '2.rules');

/**
 * Group rule ids by their first slash segment so we can clear stale
 * generated subtrees without touching the hand-written category pages
 * (1.vue.md, 2.nuxt.md) or unrelated content.
 */
function firstSegment(id) {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(0, slash);
}

const generatedSubtrees = new Set();
for (const rule of RULE_REGISTRY) {
  generatedSubtrees.add(firstSegment(rule.id));
}

for (const subtree of generatedSubtrees) {
  const target = join(rulesDir, subtree);
  // Only clear the auto-generated subtrees; leave the hand-written
  // category pages (1.vue.md, 2.nuxt.md) and any future hand-authored
  // files at the rules root untouched.
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
}

/**
 * Map a rule category to the matching hand-written category overview
 * page so each generated rule can link back to its parent. Falls back
 * to the vue page when the category isn't recognised — no rule has
 * ever landed in that case as of writing, but the fallback keeps the
 * template robust against future additions.
 */
const CATEGORY_OVERVIEW = {
  'vue-builtin': '/rules/vue',
  'ai-slop': '/rules/nuxt', // ai-slop lives in both plugins; Nuxt overview is the more exhaustive one
  reactivity: '/rules/vue',
  composition: '/rules/vue',
  performance: '/rules/vue',
  template: '/rules/vue',
  'template-perf': '/rules/vue',
  'build-quality': '/rules/vue',
  deps: '/rules/vue',
  'dead-code': '/rules/vue',
  sfc: '/rules/vue',
  structure: '/rules/nuxt',
  'modules-deps': '/rules/nuxt',
  nitro: '/rules/nuxt',
  seo: '/rules/nuxt',
  cloudflare: '/rules/nuxt',
  'server-routes': '/rules/nuxt',
  hydration: '/rules/nuxt',
  'data-fetching': '/rules/nuxt',
};

function categoryOverviewHref(category) {
  return CATEGORY_OVERVIEW[category] ?? '/rules/vue';
}

let written = 0;
for (const rule of RULE_REGISTRY) {
  const doc = loadRuleDoc(rule.id);
  if (!doc) {
    throw new Error(`loadRuleDoc returned null for known rule ${rule.id}`);
  }
  const rulePath = join(rulesDir, `${rule.id}.md`);
  mkdirSync(dirname(rulePath), { recursive: true });

  const recommendedCell = rule.recommended
    ? '✅ yes (`recommended` preset)'
    : '❌ off by default';
  const sourceCell = rule.source;
  const overviewHref = categoryOverviewHref(rule.category);

  // The description is authored text (or auto-generated fallback) and
  // always ends with a blank line before our generated table — strip a
  // trailing newline so the table sits on its own block.
  //
  // The auto-generated fallback in `rule-docs.ts#autoDescription`
  // appends a `See https://docs.the-doctor.report/rules/<id> ...` line
  // for rules without an override — but THIS page is that URL, so the
  // line would be a circular pointer. Drop it.
  const rawDescription = doc.description
    .trimEnd()
    .replace(
      /\n*See https:\/\/docs\.the-doctor\.report\/rules\/[^\s.]+\s+for details when the docs site lands\.\s*$/u,
      '',
    )
    .trimEnd();

  const body = [
    '---',
    `title: \`${rule.id}\``,
    `description: ${rule.severity}-severity ${rule.category} rule from ${rule.source}. ${rule.recommended ? 'Active in the recommended preset.' : 'Off by default.'}`,
    '---',
    '',
    `> **${rule.severity}** · \`${rule.category}\` · source: \`${sourceCell}\` · ${recommendedCell}`,
    '',
    rawDescription,
    '',
    '## Disable / configure',
    '',
    '```ts [doctor.config.ts]',
    "import { defineConfig } from '@geoql/doctor-core';",
    '',
    `export default defineConfig({`,
    `  rules: {`,
    `    '${rule.id}': '${rule.severity}', // or false to silence`,
    `  },`,
    `});`,
    '```',
    '',
    `See the [category overview](${overviewHref}) for the full rule catalogue.`,
    '',
    '::callout{type="tip"}',
    `Want this rule enforced on every push? [the-doctor.report](https://app.the-doctor.report/?utm_source=docs&utm_medium=rule-page&utm_campaign=rule-cta) tracks your score over time, gates PRs on \`${rule.id}\`, and shows the trend across every branch — free while in early access.`,
    '::',
    '',
  ].join('\n');

  writeFileSync(rulePath, body, 'utf8');
  written += 1;
}

console.log(
  `[generate-rule-pages] wrote ${written} rule pages under ${rulesDir}`,
);
