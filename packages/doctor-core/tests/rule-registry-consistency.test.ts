import { describe, expect, it } from 'vitest';
import { plugin as nuxtPlugin } from '../../oxlint-plugin-nuxt-doctor/src/plugin.js';
import { plugin as vuePlugin } from '../../oxlint-plugin-vue-doctor/src/plugin.js';
import { mapKnipDiagnostic } from '../src/dead-code/map-knip-diagnostic.js';
import type { KnipIssueKind } from '../src/dead-code/types.js';
import type { RuleCategory } from '../src/rule-registry.js';
import { RULE_REGISTRY } from '../src/rule-registry.js';
import { SFC_RULES } from '../src/sfc/rules/index.js';
import { TEMPLATE_RULES } from '../src/template/rules/index.js';

const registryIds = new Set(RULE_REGISTRY.map((r) => r.id));

// Full rule id = `${plugin.meta.name}/${localKey}`, verified against
// oxlint/generate-config.ts (allowlist) and both plugin.ts rule maps. Local
// keys already carry sub-paths (e.g. 'reactivity/watch-without-cleanup').
function pluginRuleIds(p: {
  meta: { name: string };
  rules: Record<string, unknown>;
}): string[] {
  return Object.keys(p.rules).map((key) => `${p.meta.name}/${key}`);
}

// KIND_MAP is module-private, so drive it through its only public door
// (mapKnipDiagnostic) instead of copying a list that could silently drift. The
// exhaustive Record forces a compile error if KnipIssueKind ever grows a member.
const ALL_KNIP_KINDS: Record<KnipIssueKind, true> = {
  files: true,
  exports: true,
  types: true,
  deps: true,
  devDependencies: true,
  unlisted: true,
  duplicates: true,
  enumMembers: true,
  namespaceMembers: true,
  nsExports: true,
  nsTypes: true,
  optionalPeerDependencies: true,
  binaries: true,
  unresolved: true,
  catalog: true,
};

function deadCodeRuleIds(): string[] {
  const ids = new Set<string>();
  for (const kind of Object.keys(ALL_KNIP_KINDS) as KnipIssueKind[]) {
    const diagnostic = mapKnipDiagnostic('/project', { file: 'x.ts', kind });
    if (diagnostic) ids.add(diagnostic.ruleId);
  }
  return [...ids];
}

describe('rule-registry consistency: every enumerable source rule is registered', () => {
  it('registers every vue-doctor oxlint-plugin rule', () => {
    const missing = pluginRuleIds(vuePlugin).filter(
      (id) => !registryIds.has(id),
    );
    expect(
      missing,
      `unregistered vue-doctor rules: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('registers every nuxt-doctor oxlint-plugin rule', () => {
    const missing = pluginRuleIds(nuxtPlugin).filter(
      (id) => !registryIds.has(id),
    );
    expect(
      missing,
      `unregistered nuxt-doctor rules: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('registers every template rule', () => {
    const missing = TEMPLATE_RULES.map((r) => r.id).filter(
      (id) => !registryIds.has(id),
    );
    expect(
      missing,
      `unregistered template rules: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('registers every sfc rule', () => {
    const missing = SFC_RULES.map((r) => r.id).filter(
      (id) => !registryIds.has(id),
    );
    expect(missing, `unregistered sfc rules: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('registers every dead-code rule emitted by the knip mapper', () => {
    const missing = deadCodeRuleIds().filter((id) => !registryIds.has(id));
    expect(
      missing,
      `unregistered dead-code rules: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});

const enumerableSourceIds = new Set<string>([
  ...pluginRuleIds(vuePlugin),
  ...pluginRuleIds(nuxtPlugin),
  ...TEMPLATE_RULES.map((r) => r.id),
  ...SFC_RULES.map((r) => r.id),
  ...deadCodeRuleIds(),
]);

// Categories whose every `source:'doctor'` rule is produced by an enumerable
// code surface (plugin / template / sfc / dead-code). Deliberately excluded:
// build-quality, deps, structure, modules-deps, nitro, cloudflare are
// registry-authored project passes with no enumerable export; data-fetching and
// seo are MIXED (some plugin/sfc rules, some cross-file / post-check passes), so
// a blanket reverse check there would false-fail on the project-pass ids. The
// forward checks above still fully cover the enumerable rules in those mixed
// categories — this reverse check only adds orphan detection where it is safe.
const enumerableCategories = new Set<RuleCategory>([
  'ai-slop',
  'reactivity',
  'composition',
  'performance',
  'template',
  'template-perf',
  'sfc',
  'dead-code',
  'hydration',
  'server-routes',
]);

describe('rule-registry consistency: no orphan registry entries', () => {
  it('every doctor rule in an enumerable category maps to a real source rule', () => {
    const orphans = RULE_REGISTRY.filter(
      (r) => r.source === 'doctor' && enumerableCategories.has(r.category),
    )
      .map((r) => r.id)
      .filter((id) => !enumerableSourceIds.has(id));
    expect(
      orphans,
      `orphan registry entries (no source rule): ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('has no duplicate rule ids', () => {
    const ids = RULE_REGISTRY.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
