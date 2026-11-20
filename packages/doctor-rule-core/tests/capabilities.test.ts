import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vite-plus/test';
import {
  CAPABILITIES_SETTINGS_KEY,
  capabilitiesOf,
  deriveCapabilities,
} from '../src/capabilities.js';
import { noImportsFromVueWhenAutoImported } from '../src/rules/vue/ai-slop/no-imports-from-vue-when-auto-imported.js';
import type { AstNode, RuleContext } from '../src/types.js';

describe('deriveCapabilities', () => {
  it('reads string tokens from settings["vue-doctor"].capabilities', () => {
    expect(CAPABILITIES_SETTINGS_KEY).toBe('vue-doctor');
    expect([
      ...deriveCapabilities({
        'vue-doctor': { capabilities: ['auto-imports:vue', 3] },
      }),
    ]).toEqual(['auto-imports:vue']);
  });

  it('returns an empty set for missing or malformed settings', () => {
    expect(deriveCapabilities(undefined).size).toBe(0);
    expect(deriveCapabilities({}).size).toBe(0);
    expect(
      deriveCapabilities({ 'vue-doctor': { capabilities: 'x' } }).size,
    ).toBe(0);
  });
});

describe('capabilitiesOf', () => {
  const report = (): void => {};

  it('prefers context.capabilities (ESLint wrapper)', () => {
    const ctx: RuleContext = {
      report,
      capabilities: new Set(['a']),
      settings: { 'vue-doctor': { capabilities: ['b'] } },
    };
    expect([...capabilitiesOf(ctx)]).toEqual(['a']);
  });

  it('falls back to settings (oxlint JS plugins only get settings)', () => {
    const ctx: RuleContext = {
      report,
      settings: { 'vue-doctor': { capabilities: ['b'] } },
    };
    expect([...capabilitiesOf(ctx)]).toEqual(['b']);
  });
});

describe('no-imports-from-vue-when-auto-imported via settings only', () => {
  it('fires when the capability arrives through context.settings', () => {
    const reports: string[] = [];
    const visitors = noImportsFromVueWhenAutoImported.create({
      report: (d) => reports.push(d.message),
      settings: { 'vue-doctor': { capabilities: ['auto-imports:vue'] } },
    });
    const { program } = parseSync('a.ts', "import { ref } from 'vue';", {
      sourceType: 'module',
      lang: 'ts',
    });
    const root = program as unknown as AstNode;
    visitors.Program?.(root);
    visitors.ImportDeclaration?.((root.body as AstNode[])[0]!);
    expect(reports).toHaveLength(1);
  });
});
