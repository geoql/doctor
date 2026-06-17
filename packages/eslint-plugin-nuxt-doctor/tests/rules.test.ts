import tsParser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import { RULE_REGISTRY } from '@geoql/doctor-core';
import nuxtDoctor, { plugin } from '../src/index.js';
import { NUXT_RULES } from '@geoql/doctor-rule-core';

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    sourceType: 'module',
    ecmaVersion: 2024,
  },
});

interface Fixture {
  readonly valid: readonly { readonly code: string }[];
  readonly invalid: readonly {
    readonly code: string;
    readonly errors: number;
  }[];
}

const NUXT_FIXTURES: Readonly<Record<string, Fixture>> = {
  'ai-slop/no-process-client-server': {
    valid: [{ code: `if (import.meta.client) { doSomething(); }` }],
    invalid: [
      {
        code: `const x = process.client;`,
        output: `const x = import.meta.client;`,
        errors: 1,
      },
    ],
  },
  'ai-slop/no-explicit-imports-of-auto-imported': {
    valid: [{ code: `import { ref } from 'lodash';` }],
    invalid: [{ code: `import { ref } from 'vue';`, errors: 1 }],
  },
  'ai-slop/no-useState-for-server-data': {
    valid: [
      { code: `const u = useState('u', () => localStorage.getItem('x'));` },
    ],
    invalid: [
      {
        code: `const u = useState('u', () => $fetch('/api/users'));`,
        errors: 1,
      },
    ],
  },
  'ai-slop/no-fetch-in-setup': {
    valid: [
      { code: `onMounted(async () => { const d = await $fetch('/api'); });` },
    ],
    invalid: [{ code: `const data = await $fetch('/api/users');`, errors: 1 }],
  },
  'data-fetching/useAsyncData-key-required-in-loop': {
    valid: [
      {
        code: `for (const id of ids) { useAsyncData('user-key', () => $fetch(id)); }`,
      },
    ],
    invalid: [
      {
        code: `for (const id of ids) { useAsyncData(() => $fetch(id)); }`,
        errors: 1,
      },
    ],
  },
  'server-routes/defineEventHandler-typed': {
    valid: [
      {
        code: `defineEventHandler<{ id: string }>((event) => { return event.id; });`,
      },
    ],
    invalid: [
      {
        code: `defineEventHandler((event) => { return event; });`,
        errors: 1,
      },
    ],
  },
  'server-routes/validate-body-with-h3-v2': {
    valid: [
      {
        code: `defineEventHandler(async (event) => { const body = await readValidatedBody(event); return body; });`,
      },
    ],
    invalid: [
      {
        code: `defineEventHandler(async (event) => { const body = await readBody(event); return body; });`,
        errors: 1,
      },
    ],
  },
  'server-routes/createError-on-failure': {
    valid: [
      {
        code: `defineEventHandler(() => { throw createError({ statusCode: 500 }); });`,
      },
    ],
    invalid: [
      {
        code: `defineEventHandler(() => { throw new Error('oops'); });`,
        errors: 1,
      },
    ],
  },
  'hydration/no-document-in-setup': {
    valid: [{ code: `onMounted(() => { const t = document.title; });` }],
    invalid: [{ code: `const title = document.title;`, errors: 1 }],
  },
  'hydration/clientOnly-for-browser-apis': {
    valid: [
      { code: `if (import.meta.client) { const loc = window.location; }` },
    ],
    invalid: [{ code: `const loc = window.location;`, errors: 1 }],
  },
  'security/no-user-input-in-fetch-url': {
    valid: [
      {
        code: `useFetch('/api/content', { query: { id: route.query.id } });`,
      },
    ],
    invalid: [
      { code: `const { data } = useFetch(route.query.redirect);`, errors: 1 },
    ],
  },
};

describe('nuxt plugin rule coverage', () => {
  for (const shortId of Object.keys(NUXT_FIXTURES).sort()) {
    const fixture = NUXT_FIXTURES[shortId]!;
    const namespacedId = `nuxt-doctor/${shortId}`;
    it(`${namespacedId} matches the fixture (valid + invalid)`, () => {
      const rule = plugin.rules[shortId]!;
      tsRuleTester.run(namespacedId, rule, {
        valid: [...fixture.valid],
        invalid: [...fixture.invalid],
      });
    });
  }
});

describe('nuxt plugin preset integrity', () => {
  it('plugin.rules contains every short id from the shared core', () => {
    const pluginIds = Object.keys(plugin.rules).sort();
    const coreIds = NUXT_RULES.map((r) => r.id).sort();
    expect(pluginIds).toEqual(coreIds);
  });

  it('plugin.meta.name is nuxt-doctor', () => {
    expect(plugin.meta.name).toBe('nuxt-doctor');
  });

  it('default export === plugin', () => {
    expect(nuxtDoctor).toBe(plugin);
  });

  it('recommended preset references only real rule ids at the right severity', () => {
    const recBlock = nuxtDoctor.configs.recommended[0]!;
    const registered = new Map(
      RULE_REGISTRY.filter((r) => r.id.startsWith('nuxt-doctor/')).map((r) => [
        r.id,
        r.severity,
        r.recommended,
      ]),
    );
    const expectedIds = new Set(
      NUXT_RULES.filter((r) => r.recommended).map((r) => `nuxt-doctor/${r.id}`),
    );
    const actualIds = new Set(Object.keys(recBlock.rules));
    expect(actualIds).toEqual(expectedIds);
    for (const [fullId, severity] of Object.entries(recBlock.rules)) {
      const registryEntry = registered.get(fullId);
      expect(registryEntry, `missing registry entry: ${fullId}`).toBeDefined();
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
    const allBlock = nuxtDoctor.configs.all[0]!;
    for (const r of NUXT_RULES) {
      const eslintSev = r.severity === 'error' ? 'error' : 'warn';
      expect(allBlock.rules[`nuxt-doctor/${r.id}`]).toBe(eslintSev);
    }
  });
});

describe('nuxt plugin runtime: real Linter with recommended preset', () => {
  it('fires nuxt-doctor/hydration/no-document-in-setup on document.title', () => {
    const linter = new Linter({ configType: 'flat' });
    const messages = linter.verify(
      `const title = document.title;`,
      [
        {
          files: ['**/*.{js,jsx,ts,tsx,vue}'],
          languageOptions: { parser: tsParser, ecmaVersion: 2024 },
          plugins: { 'nuxt-doctor': { rules: plugin.rules } },
          rules: { 'nuxt-doctor/hydration/no-document-in-setup': 'error' },
        },
      ],
      { filename: 'app.ts' },
    );
    const ids = messages.map((m) => m.ruleId);
    expect(ids).toContain('nuxt-doctor/hydration/no-document-in-setup');
  });
});
