import tsParser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import { RULE_REGISTRY } from '@geoql/doctor-core';
import vueDoctor, { plugin } from '../src/index.js';
import { VUE_RULES } from '@geoql/doctor-rule-core';

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    sourceType: 'module',
    ecmaVersion: 2024,
  },
});

const EM_DASH = '\u2014';

interface Fixture {
  readonly valid: readonly {
    readonly code: string;
    readonly settings?: Record<string, unknown>;
  }[];
  readonly invalid: readonly {
    readonly code: string;
    readonly settings?: Record<string, unknown>;
    readonly errors: number;
  }[];
}

const VUE_FIXTURES: Readonly<Record<string, Fixture>> = {
  'no-em-dash-in-string': {
    valid: [{ code: `const s = "plain hyphen - here";` }],
    invalid: [
      {
        code: `const s = "before${EM_DASH}after";`,
        output: `const s = "before-after";`,
        errors: 1,
      },
    ],
  },
  'no-destructure-props-without-to-refs': {
    valid: [{ code: `const { a, b } = toRefs(defineProps());` }],
    invalid: [{ code: `const { a, b } = defineProps();`, errors: 1 }],
  },
  'no-destructure-reactive-without-to-refs': {
    valid: [{ code: `const { a } = toRefs(reactive({ a: 1 }));` }],
    invalid: [
      { code: `const { a, b } = reactive({ a: 1, b: 2 });`, errors: 1 },
    ],
  },
  'no-non-null-assertion-on-ref-value': {
    valid: [
      { code: `const x = document.getElementById('a')!;\nconst y = arr![0];` },
    ],
    invalid: [{ code: `const r = ref(0);\nconst x = r.value!;`, errors: 1 }],
  },
  'no-imports-from-vue-when-auto-imported': {
    valid: [{ code: `import { ref } from 'vue';` }],
    invalid: [
      {
        code: `import { ref } from 'vue';`,
        settings: { 'vue-doctor': { capabilities: ['auto-imports:vue'] } },
        errors: 1,
      },
    ],
  },
  'reactivity/watch-without-cleanup': {
    valid: [
      {
        code: `watch(src, () => { window.addEventListener('resize', h); onWatcherCleanup(() => window.removeEventListener('resize', h)); });`,
      },
    ],
    invalid: [
      {
        code: `watch(src, () => { window.addEventListener('resize', onResize); });`,
        errors: 1,
      },
      {
        // Returning a function from a watch callback is a no-op in Vue -
        // the cleanup never runs, so this must be reported (geoql/doctor#179).
        code: `watch(src, () => { window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); });`,
        errors: 1,
      },
    ],
  },
  'reactivity/prefer-shallowRef-for-large-data': {
    valid: [{ code: `const r = ref(0);` }],
    invalid: [{ code: `const r = ref(axios.get('/api/items'));`, errors: 1 }],
  },
  'reactivity/prefer-readonly-for-injected': {
    valid: [
      { code: `const u = inject('user');\nconst name = u.name;\nuse(u);` },
    ],
    invalid: [{ code: `const u = inject('user');\nu.name = 'x';`, errors: 1 }],
  },
  'composition/prefer-script-setup-for-new-files': {
    valid: [{ code: `const x = ref(0);` }],
    invalid: [
      { code: `export default { setup() { return {}; } };`, errors: 1 },
    ],
  },
  'composition/defineProps-typed': {
    valid: [{ code: `defineProps<{ name: string }>();` }],
    invalid: [{ code: `defineProps({ name: String });`, errors: 1 }],
  },
  'performance/prefer-defineAsyncComponent-on-route': {
    valid: [
      {
        code: `const routes = [{ path: '/', component: () => import('./Foo.vue') }];`,
      },
    ],
    invalid: [
      { code: `const routes = [{ path: '/', component: Home }];`, errors: 1 },
    ],
  },
  'security/no-inner-html': {
    valid: [{ code: `el.textContent = userContent;` }],
    invalid: [{ code: `el.innerHTML = userContent;`, errors: 1 }],
  },
  'security/no-eval-like': {
    valid: [{ code: `JSON.parse(data);\nconst d = new Date();` }],
    invalid: [{ code: `eval(code);`, errors: 1 }],
  },
  'security/no-auth-token-in-web-storage': {
    valid: [{ code: `localStorage.setItem('theme', 'dark');` }],
    invalid: [{ code: `localStorage.setItem('accessToken', t);`, errors: 1 }],
  },
  'security/no-secrets-in-source': {
    valid: [{ code: `const theme = 'dark';` }],
    invalid: [{ code: `const x = 'sk-live-abc123xyz789def';`, errors: 1 }],
  },
};

describe('vue plugin rule coverage', () => {
  for (const shortId of Object.keys(VUE_FIXTURES).sort()) {
    const fixture = VUE_FIXTURES[shortId]!;
    const namespacedId = `vue-doctor/${shortId}`;
    it(`${namespacedId} matches the fixture (valid + invalid)`, () => {
      const rule = plugin.rules[shortId]!;
      tsRuleTester.run(namespacedId, rule, {
        valid: [...fixture.valid],
        invalid: [...fixture.invalid],
      });
    });
  }
});

describe('vue plugin preset integrity', () => {
  it('plugin.rules contains every short id from the shared core', () => {
    const pluginIds = Object.keys(plugin.rules).sort();
    const coreIds = VUE_RULES.map((r) => r.id).sort();
    expect(pluginIds).toEqual(coreIds);
  });

  it('plugin.meta.name is vue-doctor', () => {
    expect(plugin.meta.name).toBe('vue-doctor');
  });

  it('default export === plugin', () => {
    expect(vueDoctor).toBe(plugin);
  });

  it('recommended preset references only real rule ids at the right severity', () => {
    const recBlock = vueDoctor.configs.recommended[0]!;
    const registered = new Map(
      RULE_REGISTRY.filter((r) => r.id.startsWith('vue-doctor/')).map((r) => [
        r.id,
        r.severity,
        r.recommended,
      ]),
    );
    const expectedIds = new Set(
      VUE_RULES.filter((r) => r.recommended).map((r) => `vue-doctor/${r.id}`),
    );
    const actualIds = new Set(Object.keys(recBlock.rules));
    expect(actualIds).toEqual(expectedIds);
    for (const [fullId, severity] of Object.entries(recBlock.rules)) {
      const registryEntry = registered.get(fullId);
      expect(registryEntry, `missing registry entry: ${fullId}`).toBeDefined();
      // map internal severity -> eslint severity
      const expectedEslint =
        registryEntry === 'error'
          ? 'error'
          : registryEntry === 'warn'
            ? 'warn'
            : 'warn';
      expect(severity).toBe(expectedEslint);
    }
  });

  it('all preset wires every plugin rule at its mapped severity', () => {
    const allBlock = vueDoctor.configs.all[0]!;
    for (const r of VUE_RULES) {
      const eslintSev = r.severity === 'error' ? 'error' : 'warn';
      expect(allBlock.rules[`vue-doctor/${r.id}`]).toBe(eslintSev);
    }
  });

  it('recommended preset wires only recommended rules', () => {
    const recBlock = vueDoctor.configs.recommended[0]!;
    const recIds = new Set(Object.keys(recBlock.rules));
    for (const r of VUE_RULES) {
      const full = `vue-doctor/${r.id}`;
      if (r.recommended) {
        expect(recIds.has(full)).toBe(true);
      } else {
        expect(recIds.has(full)).toBe(false);
      }
    }
  });
});

describe('vue plugin runtime: real Linter with recommended preset', () => {
  it('fires vue-doctor/security/no-eval-like on eval()', () => {
    const linter = new Linter({ configType: 'flat' });
    const messages = linter.verify(
      `eval(userInput);`,
      [
        {
          files: ['**/*.{js,jsx,ts,tsx,vue}'],
          languageOptions: { parser: tsParser, ecmaVersion: 2024 },
          plugins: { 'vue-doctor': { rules: plugin.rules } },
          rules: { 'vue-doctor/security/no-eval-like': 'error' },
        },
      ],
      { filename: 'app.ts' },
    );
    const ids = messages.map((m) => m.ruleId);
    expect(ids).toContain('vue-doctor/security/no-eval-like');
  });
});
