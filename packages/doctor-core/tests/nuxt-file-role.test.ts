import { describe, expect, it } from 'vitest';
import {
  isNuxtLayoutFile,
  isNuxtPageFile,
  isNuxtServerFile,
} from '../src/nuxt/file-role.js';

describe('isNuxtPageFile', () => {
  it('matches a flat pages directory file', () => {
    expect(isNuxtPageFile('pages/index.vue')).toBe(true);
  });

  it('matches a Nuxt 4 app/pages directory file', () => {
    expect(isNuxtPageFile('app/pages/index.vue')).toBe(true);
  });

  it('matches a deeply nested dynamic route page', () => {
    expect(isNuxtPageFile('app/pages/users/[id].vue')).toBe(true);
  });

  it('normalizes windows path separators', () => {
    expect(isNuxtPageFile('app\\pages\\index.vue')).toBe(true);
  });

  it('tolerates a leading ./ segment', () => {
    expect(isNuxtPageFile('./pages/about.vue')).toBe(true);
  });

  it('rejects a non-vue file inside pages', () => {
    expect(isNuxtPageFile('pages/index.ts')).toBe(false);
  });

  it('rejects a vue file outside any pages directory', () => {
    expect(isNuxtPageFile('components/Foo.vue')).toBe(false);
  });

  it('rejects a pages directory that is not at the project root', () => {
    expect(isNuxtPageFile('src/pages/x.vue')).toBe(false);
  });

  it('rejects a top-level file merely named like the segment', () => {
    expect(isNuxtPageFile('pages.vue')).toBe(false);
  });
});

describe('isNuxtServerFile', () => {
  it('matches a server api handler', () => {
    expect(isNuxtServerFile('server/api/users.ts')).toBe(true);
  });

  it('matches a nested server middleware file', () => {
    expect(isNuxtServerFile('server/middleware/auth.ts')).toBe(true);
  });

  it('normalizes windows path separators', () => {
    expect(isNuxtServerFile('server\\api\\x.ts')).toBe(true);
  });

  it('rejects a non-ts file inside server', () => {
    expect(isNuxtServerFile('server/api/users.js')).toBe(false);
  });

  it('rejects a ts file outside the server directory', () => {
    expect(isNuxtServerFile('api/users.ts')).toBe(false);
  });

  it('rejects a server directory nested under app', () => {
    expect(isNuxtServerFile('app/server/x.ts')).toBe(false);
  });
});

describe('isNuxtLayoutFile', () => {
  it('matches a flat layouts directory file', () => {
    expect(isNuxtLayoutFile('layouts/default.vue')).toBe(true);
  });

  it('matches a Nuxt 4 app/layouts directory file', () => {
    expect(isNuxtLayoutFile('app/layouts/default.vue')).toBe(true);
  });

  it('matches a nested layout file', () => {
    expect(isNuxtLayoutFile('app/layouts/nested/admin.vue')).toBe(true);
  });

  it('normalizes windows path separators', () => {
    expect(isNuxtLayoutFile('layouts\\default.vue')).toBe(true);
  });

  it('rejects a non-vue layout file', () => {
    expect(isNuxtLayoutFile('layouts/default.ts')).toBe(false);
  });

  it('rejects a layouts directory that is not at the project root', () => {
    expect(isNuxtLayoutFile('components/layouts/x.vue')).toBe(false);
  });
});
