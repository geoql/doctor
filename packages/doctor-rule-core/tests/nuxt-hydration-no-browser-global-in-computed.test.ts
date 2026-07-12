import { describe, expect, it } from 'vitest';
import { noBrowserGlobalInComputed } from '../src/rules/nuxt/hydration/no-browser-global-in-computed.js';
import { runRule } from './run-rule.js';

const rule = noBrowserGlobalInComputed;

describe('hydration/no-browser-global-in-computed', () => {
  it('fires for window access inside a computed getter', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => window.innerWidth);`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('SSR');
  });

  it('fires for localStorage access inside a computed getter', () => {
    const reports = runRule(
      rule,
      `const theme = computed(() => localStorage.getItem('theme'));`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for document access inside computed with a block body', () => {
    const reports = runRule(
      rule,
      `const el = computed(() => { return document.querySelector('#x'); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when guarded by import.meta.client', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => import.meta.client ? window.innerWidth : 0);`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when a conditional guard wraps localStorage', () => {
    const reports = runRule(
      rule,
      `const theme = computed(() => import.meta.client ? localStorage.getItem('theme') : null);`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when guarded by an if import.meta.client block', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => { if (import.meta.client) { return window.innerWidth; } return 0; });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('still fires when an if condition is not an import.meta.client guard', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => { if (ready.value) { return window.innerWidth; } return 0; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('still fires when a conditional test is not a member expression guard', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => ready.value ? window.innerWidth : 0);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('still fires when import.meta property is not client', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => import.meta.server ? window.innerWidth : 0);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire for browser globals inside event handlers', () => {
    const reports = runRule(rule, `function onClick() { window.open('/'); }`);
    expect(reports).toHaveLength(0);
  });

  it('does not fire for browser globals inside onMounted', () => {
    const reports = runRule(
      rule,
      `onMounted(() => { document.title = 'hi'; });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for non-browser identifiers inside computed', () => {
    const reports = runRule(
      rule,
      `const total = computed(() => items.value.length);`,
    );
    expect(reports).toHaveLength(0);
  });

  it('fires for navigator access inside a nested helper called shape within computed', () => {
    const reports = runRule(
      rule,
      `const lang = computed(() => navigator.language);`,
    );
    expect(reports).toHaveLength(1);
  });
  it('still fires when the if condition is a plain identifier', () => {
    const reports = runRule(
      rule,
      `const width = computed(() => { if (flag) { return window.innerWidth; } return 0; });`,
    );
    expect(reports).toHaveLength(1);
  });
});
