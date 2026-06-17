import { describe, expect, it } from 'vitest';
import {
  firedRuleIds,
  hasStackOverflow,
  runOxlint,
  runOxlintFix,
} from './run-oxlint.js';

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

  it('security/no-user-input-in-fetch-url fires on a route-controlled URL', () => {
    const result = runOxlint(
      'security/no-user-input-in-fetch-url',
      `const { data } = useFetch(route.query.redirect);`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'nuxt-doctor(security/no-user-input-in-fetch-url)',
    );
  });

  it('security/no-user-input-in-fetch-url does NOT fire on a fixed path', () => {
    const result = runOxlint(
      'security/no-user-input-in-fetch-url',
      `const { data } = useFetch('/api/content', { query: { id: route.query.id } });`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(security/no-user-input-in-fetch-url)',
    );
  });
});

describe('e2e: real oxlint --fix applies nuxt-doctor fixes to disk', () => {
  it('no-process-client-server rewrites process.client to import.meta.client', () => {
    const { after } = runOxlintFix(
      'ai-slop/no-process-client-server',
      `export const a = process.client;\n`,
    );
    expect(after).toBe(`export const a = import.meta.client;\n`);
  });

  it('rewrites every legacy process flag and leaves process.env untouched', () => {
    const source = [
      `export const a = process.client;`,
      `export const b = process.server ? 1 : 2;`,
      `export const c = process.browser;`,
      `export const d = process.env.NODE_ENV;`,
      ``,
    ].join('\n');
    const { after } = runOxlintFix('ai-slop/no-process-client-server', source);
    expect(after).toContain(`export const a = import.meta.client;`);
    expect(after).toContain(`export const b = import.meta.server ? 1 : 2;`);
    expect(after).toContain(`export const c = import.meta.browser;`);
    expect(after).toContain(`export const d = process.env.NODE_ENV;`);
  });

  it('the rewrite is idempotent on a second pass', () => {
    const first = runOxlintFix(
      'ai-slop/no-process-client-server',
      `if (process.server) { run(); }\n`,
    );
    const second = runOxlintFix(
      'ai-slop/no-process-client-server',
      first.after,
    );
    expect(second.after).toBe(first.after);
    expect(second.after).toBe(`if (import.meta.server) { run(); }\n`);
  });

  it('the re-linted fixed output no longer reports the finding', () => {
    const { after } = runOxlintFix(
      'ai-slop/no-process-client-server',
      `const x = process.client;\n`,
    );
    const result = runOxlint('ai-slop/no-process-client-server', after);
    expect(firedRuleIds(result)).not.toContain(
      'nuxt-doctor(ai-slop/no-process-client-server)',
    );
  });
});
