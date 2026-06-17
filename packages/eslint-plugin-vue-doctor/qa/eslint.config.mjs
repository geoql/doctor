import tsParser from '@typescript-eslint/parser';
import vueDoctor from '../dist/index.js';
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    languageOptions: { parser: tsParser, sourceType: 'module' },
  },
  ...vueDoctor.configs.recommended,
  { ignores: ['node_modules/**', 'dist/**'] },
];
