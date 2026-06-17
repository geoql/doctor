import nuxtDoctor from '../dist/index.js';
import tsParser from '@typescript-eslint/parser';
export default [
  ...nuxtDoctor.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
  { ignores: ['node_modules/**', 'dist/**'] },
];
