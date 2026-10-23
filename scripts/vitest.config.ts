import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    name: 'scripts',
    include: ['*.test.ts'],
  },
});
