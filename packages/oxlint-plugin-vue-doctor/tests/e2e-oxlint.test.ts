import { describe, expect, it } from 'vitest';
import {
  firedRuleIds,
  hasStackOverflow,
  runOxlint,
  runOxlintFix,
} from './run-oxlint.js';

const EM_DASH = '\u2014';

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

  it('performance/prefer-defineAsyncComponent-on-route fires on a bare component reference', () => {
    const result = runOxlint(
      'performance/prefer-defineAsyncComponent-on-route',
      `const routes = [{ path: '/', component: Home }];`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(performance/prefer-defineAsyncComponent-on-route)',
    );
  });

  it('security/no-inner-html fires on an innerHTML assignment', () => {
    const result = runOxlint(
      'security/no-inner-html',
      `el.innerHTML = userContent;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(security/no-inner-html)',
    );
  });

  it('security/no-inner-html does NOT fire on textContent', () => {
    const result = runOxlint(
      'security/no-inner-html',
      `el.textContent = userContent;`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(security/no-inner-html)',
    );
  });

  it('security/no-eval-like fires on eval', () => {
    const result = runOxlint('security/no-eval-like', `eval(code);`);
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain('vue-doctor(security/no-eval-like)');
  });

  it('security/no-eval-like does NOT fire on JSON.parse', () => {
    const result = runOxlint('security/no-eval-like', `JSON.parse(data);`);
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(security/no-eval-like)',
    );
  });

  it('security/no-auth-token-in-web-storage fires on a token setItem', () => {
    const result = runOxlint(
      'security/no-auth-token-in-web-storage',
      `localStorage.setItem('accessToken', t);`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(security/no-auth-token-in-web-storage)',
    );
  });

  it('security/no-auth-token-in-web-storage does NOT fire on a theme key', () => {
    const result = runOxlint(
      'security/no-auth-token-in-web-storage',
      `localStorage.setItem('theme', 'dark');`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(security/no-auth-token-in-web-storage)',
    );
  });

  it('security/no-secrets-in-source fires on a high-signal secret literal', () => {
    const result = runOxlint(
      'security/no-secrets-in-source',
      `const k = 'sk-live-abc123xyz789def';`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).toContain(
      'vue-doctor(security/no-secrets-in-source)',
    );
  });

  it('security/no-secrets-in-source does NOT fire on a plain short string', () => {
    const result = runOxlint(
      'security/no-secrets-in-source',
      `const theme = 'dark';`,
    );
    expect(hasStackOverflow(result)).toBe(false);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(security/no-secrets-in-source)',
    );
  });
});

describe('e2e: real oxlint --fix applies vue-doctor fixes to disk', () => {
  it('no-em-dash-in-string replaces the em dash with a hyphen', () => {
    const { after } = runOxlintFix(
      'no-em-dash-in-string',
      `const s = "loading${EM_DASH}please wait";\n`,
    );
    expect(after).toBe(`const s = "loading-please wait";\n`);
    expect(after).not.toContain(EM_DASH);
  });

  it('no-em-dash-in-string fix is idempotent on a second pass', () => {
    const first = runOxlintFix(
      'no-em-dash-in-string',
      `const s = "a${EM_DASH}b${EM_DASH}c";\n`,
    );
    const second = runOxlintFix('no-em-dash-in-string', first.after);
    expect(second.after).toBe(first.after);
    expect(second.after).toBe(`const s = "a-b-c";\n`);
  });

  it('no-em-dash-in-string leaves surrounding code and escaped sequences untouched', () => {
    const source = [
      `const keep = 1 - 2;`,
      `const esc = "x\\u2014y";`,
      `const hit = "p${EM_DASH}q";`,
      ``,
    ].join('\n');
    const { after } = runOxlintFix('no-em-dash-in-string', source);
    expect(after).toContain(`const keep = 1 - 2;`);
    expect(after).toContain(`const esc = "x\\u2014y";`);
    expect(after).toContain(`const hit = "p-q";`);
  });

  it('the re-linted fixed output no longer reports the em-dash finding', () => {
    const { after } = runOxlintFix(
      'no-em-dash-in-string',
      `const s = "before${EM_DASH}after";\n`,
    );
    const result = runOxlint('no-em-dash-in-string', after);
    expect(firedRuleIds(result)).not.toContain(
      'vue-doctor(no-em-dash-in-string)',
    );
  });
});
