import { describe, expect, it } from 'vitest';
import { firedRuleIds, hasStackOverflow, runOxlint } from './run-oxlint.js';

describe('e2e: real oxlint integration', () => {
  it('no-process-client-server fires on process.client', () => {
    const result = runOxlint(
      'ai-slop/no-process-client-server',
      `const x = process.client;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'nuxt-doctor(ai-slop/no-process-client-server)',
    );
  });

  it('no-process-client-server does NOT fire on import.meta.client', () => {
    const result = runOxlint(
      'ai-slop/no-process-client-server',
      `if (import.meta.client) { doSomething(); }`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(ai-slop/no-process-client-server)',
    );
  });

  it('useAsyncData-key-required-in-loop fires on useAsyncData in loop without key', () => {
    const result = runOxlint(
      'data-fetching/useAsyncData-key-required-in-loop',
      `for (const id of ids) { useAsyncData(id, () => $fetch(id)); }`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'nuxt-doctor(data-fetching/useAsyncData-key-required-in-loop)',
    );
  });

  it('useAsyncData-key-required-in-loop does NOT fire with plain string literal key', () => {
    const result = runOxlint(
      'data-fetching/useAsyncData-key-required-in-loop',
      `for (const id of ids) { useAsyncData('user-key', () => $fetch(id)); }`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(data-fetching/useAsyncData-key-required-in-loop)',
    );
  });

  it('no-document-in-setup fires on document at top level', () => {
    const result = runOxlint(
      'hydration/no-document-in-setup',
      `const title = document.title;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'nuxt-doctor(hydration/no-document-in-setup)',
    );
  });

  it('no-document-in-setup does NOT fire inside onMounted', () => {
    const result = runOxlint(
      'hydration/no-document-in-setup',
      `onMounted(() => { const t = document.title; });`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(hydration/no-document-in-setup)',
    );
  });

  it('clientOnly-for-browser-apis fires on window.location without guard', () => {
    const result = runOxlint(
      'hydration/clientOnly-for-browser-apis',
      `const loc = window.location;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'nuxt-doctor(hydration/clientOnly-for-browser-apis)',
    );
  });

  it('clientOnly-for-browser-apis does NOT fire inside import.meta.client guard', () => {
    const result = runOxlint(
      'hydration/clientOnly-for-browser-apis',
      `if (import.meta.client) { const loc = window.location; }`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(hydration/clientOnly-for-browser-apis)',
    );
  });
});
