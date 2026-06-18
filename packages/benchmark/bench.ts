import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { audit } from '@geoql/doctor-core';
import { bench, run } from 'mitata';

const FIXTURES_VUE = resolve(
  new URL('.', import.meta.url).pathname,
  'fixtures/vue',
);
const FIXTURES_NUXT = resolve(
  new URL('.', import.meta.url).pathname,
  'fixtures/nuxt',
);

async function runBenchmarks() {
  const vueExists = existsSync(FIXTURES_VUE);
  const nuxtExists = existsSync(FIXTURES_NUXT);

  if (!vueExists && !nuxtExists) {
    console.error(
      'No fixtures found. Run: pnpm --filter @geoql/doctor-benchmark gen-fixtures',
    );
    process.exit(1);
  }

  if (vueExists) {
    bench('doctor (vue, audit API)', async () => {
      await audit({ rootDir: FIXTURES_VUE, deadCode: false });
    });

    try {
      const { ESLint } = await import('eslint');
      const vueParser = (await import('vue-eslint-parser')).default;
      const vuePlugin = (await import('eslint-plugin-vue')).default;

      bench('eslint-plugin-vue (vue)', async () => {
        const engine = new ESLint({
          overrideConfigFile: true,
          ignore: false,
          overrideConfig: {
            languageOptions: { parser: vueParser },
            plugins: { vue: vuePlugin },
            rules: {
              'vue/block-lang': 'off',
              'vue/no-v-html': 'off',
              'vue/require-default-prop': 'off',
              'vue/multi-word-component-names': 'off',
              'vue/no-unused-vars': 'warn',
              'vue/no-undef-components': 'off',
              'vue/no-setup-props-reactivity': 'warn',
            },
          },
        });
        const files = readdirSync(FIXTURES_VUE)
          .filter((f) => f.endsWith('.vue'))
          .map((f) => resolve(FIXTURES_VUE, f));
        await engine.lintFiles(files);
      });
    } catch (err) {
      console.log(`eslint-plugin-vue skipped: ${err.message}`);
    }
  }

  if (nuxtExists) {
    bench('doctor (nuxt, audit API)', async () => {
      await audit({ rootDir: FIXTURES_NUXT, deadCode: false });
    });
  }

  await run();
}

runBenchmarks().catch(console.error);
