import { describe, expect, it } from 'vitest';
import defaultExport, { plugin, VUE_AUTO_IMPORTED } from '../src/index.js';

describe('plugin index', () => {
  it('exposes the vue-doctor meta name', () => {
    expect(plugin.meta.name).toBe('vue-doctor');
  });

  it('registers all twenty-four rules', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(
      [
        'no-destructure-props-without-to-refs',
        'no-destructure-reactive-without-to-refs',
        'no-em-dash-in-string',
        'no-imports-from-vue-when-auto-imported',
        'no-non-null-assertion-on-ref-value',
        'reactivity/watch-without-cleanup',
        'reactivity/prefer-shallowRef-for-large-data',
        'reactivity/prefer-readonly-for-injected',
        'reactivity/no-fresh-deps-in-watch',
        'reactivity/no-stale-timer-ref',
        'reactivity/effect-listener-cleanup-mismatch',
        'composition/prefer-script-setup-for-new-files',
        'composition/defineProps-typed',
        'composition/no-pinia-store-in-setup',
        'composition/no-prop-callback-in-setup',
        'performance/prefer-defineAsyncComponent-on-route',
        'performance/prefer-module-scope-static-value',
        'performance/prefer-module-scope-pure-function',
        'performance/prefer-stable-empty-fallback',
        'security/no-inner-html',
        'security/no-eval-like',
        'security/no-auth-token-in-web-storage',
        'security/no-secrets-in-source',
        'security/markdown-it-unsanitized-html',
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

  it('re-exports the VUE_AUTO_IMPORTED symbol set for downstream plugins', () => {
    expect(VUE_AUTO_IMPORTED.has('ref')).toBe(true);
    expect(VUE_AUTO_IMPORTED.has('useTemplateRef')).toBe(true);
    expect(VUE_AUTO_IMPORTED.has('Component')).toBe(false);
  });
});
