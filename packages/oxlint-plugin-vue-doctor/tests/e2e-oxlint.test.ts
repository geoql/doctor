import { describe, expect, it } from 'vitest';
import { firedRuleIds, hasStackOverflow, runOxlint } from './run-oxlint.js';

describe('e2e: real oxlint integration', () => {
  it('watch-without-cleanup fires on uncleaned addEventListener', () => {
    const result = runOxlint(
      'reactivity/watch-without-cleanup',
      `watch(src, () => { window.addEventListener('resize', h); });`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(reactivity/watch-without-cleanup)',
    );
  });

  it('watch-without-cleanup does NOT fire on cleaned-up watcher', () => {
    const result = runOxlint(
      'reactivity/watch-without-cleanup',
      `watch(src, () => { window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); });`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(reactivity/watch-without-cleanup)',
    );
  });

  it('prefer-shallowRef-for-large-data fires on large array', () => {
    const bigArray = `[${Array.from({ length: 101 }, () => '1').join(',')}]`;
    const result = runOxlint(
      'reactivity/prefer-shallowRef-for-large-data',
      `const r = ref(${bigArray});`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(reactivity/prefer-shallowRef-for-large-data)',
    );
  });

  it('prefer-shallowRef-for-large-data does NOT fire on small array', () => {
    const result = runOxlint(
      'reactivity/prefer-shallowRef-for-large-data',
      `const r = ref([1, 2, 3]);`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(reactivity/prefer-shallowRef-for-large-data)',
    );
  });

  it('prefer-readonly-for-injected fires on mutation', () => {
    const result = runOxlint(
      'reactivity/prefer-readonly-for-injected',
      `const u = inject('user');\nu.name = 'x';`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(reactivity/prefer-readonly-for-injected)',
    );
  });

  it('prefer-readonly-for-injected does NOT fire on read-only access', () => {
    const result = runOxlint(
      'reactivity/prefer-readonly-for-injected',
      `const u = inject('user');\nconst name = u.name;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(reactivity/prefer-readonly-for-injected)',
    );
  });

  it('composition/prefer-script-setup-for-new-files fires on options setup()', () => {
    const result = runOxlint(
      'composition/prefer-script-setup-for-new-files',
      `export default { setup() { return {}; } };`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(composition/prefer-script-setup-for-new-files)',
    );
  });

  it('composition/defineProps-typed fires on a runtime props object', () => {
    const result = runOxlint(
      'composition/defineProps-typed',
      `defineProps({ name: String });`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(composition/defineProps-typed)',
    );
  });
});
