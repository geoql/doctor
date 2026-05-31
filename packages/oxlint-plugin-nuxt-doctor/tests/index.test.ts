import { describe, expect, it } from 'vitest';
import defaultExport, { plugin, NUXT_AUTO_IMPORTED } from '../src/index.js';

describe('plugin index', () => {
  it('exposes the nuxt-doctor meta name', () => {
    expect(plugin.meta.name).toBe('nuxt-doctor');
  });

  it('registers all ten rules', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(
      [
        'ai-slop/no-process-client-server',
        'ai-slop/no-explicit-imports-of-auto-imported',
        'ai-slop/no-useState-for-server-data',
        'ai-slop/no-fetch-in-setup',
        'data-fetching/useAsyncData-key-required-in-loop',
        'server-routes/defineEventHandler-typed',
        'server-routes/validate-body-with-h3-v2',
        'server-routes/createError-on-failure',
        'hydration/no-document-in-setup',
        'hydration/clientOnly-for-browser-apis',
      ].sort(),
    );
  });

  it('each registered rule is a valid rule with a create function', () => {
    for (const value of Object.values(plugin.rules)) {
      expect(typeof value.create).toBe('function');
    }
  });

  it('default export is the same object as the named plugin export', () => {
    expect(defaultExport).toBe(plugin);
  });

  it('re-exports the NUXT_AUTO_IMPORTED symbol set for downstream plugins', () => {
    expect(NUXT_AUTO_IMPORTED.has('ref')).toBe(true);
    expect(NUXT_AUTO_IMPORTED.has('useRoute')).toBe(true);
    expect(NUXT_AUTO_IMPORTED.has('useFetch')).toBe(true);
    expect(NUXT_AUTO_IMPORTED.has('definePageMeta')).toBe(true);
    expect(NUXT_AUTO_IMPORTED.has('Component')).toBe(false);
  });
});
