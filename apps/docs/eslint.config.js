// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat';
import oxlint from 'eslint-plugin-oxlint';

export default createConfigForNuxt({
  features: {
    stylistic: false,
    tooling: true,
    typescript: true,
  },
})
  .override('nuxt/vue/rules', {
    files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  })
  .append(...oxlint.configs['flat/recommended'])
  .append({
    rules: {
      // oxfmt owns self-closing; keeping this on starts a formatter-vs-linter war.
      'vue/html-self-closing': 'off',
    },
  });
