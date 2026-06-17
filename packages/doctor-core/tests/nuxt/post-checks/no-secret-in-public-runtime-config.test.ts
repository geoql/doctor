import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNoSecretInPublicRuntimeConfig } from '../../../src/nuxt/post-checks/no-secret-in-public-runtime-config.js';
import { fixture, makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/security/no-secret-in-public-runtime-config';

describe('checkNoSecretInPublicRuntimeConfig', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({
      'nuxt.config.ts':
        'export default defineNuxtConfig({ runtimeConfig: { public: { apiSecret: "" } } })',
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({ rootDirectory: dir, packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when there is no nuxt.config', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('warns on a secret-named key under runtimeConfig.public', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiSecret: '',
    },
  },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('error');
    expect(issue.message).toContain('apiSecret');
  });

  it('emits one diagnostic per offending public key with distinct positions', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiSecret: '',
      dbPassword: '',
    },
  },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(2);
    const positions = issues.map((i) => `${i.line}:${i.column}`);
    expect(new Set(positions).size).toBe(2);
  });

  it('does not flag a non-secret public key', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: {
    public: { apiBase: '/api' },
  },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('does not flag a secret at the private root of runtimeConfig', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',
    public: { apiBase: '/api' },
  },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when runtimeConfig has no public block', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: { apiSecret: '' },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the config has no defineNuxtConfig object', async () => {
    const dir = await fixture({
      'nuxt.config.ts': 'export default {}',
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the default export is a non-defineNuxtConfig call', async () => {
    const dir = await fixture({
      'nuxt.config.ts':
        'export default someWrapper({ runtimeConfig: { public: { apiSecret: "" } } })',
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the config has no default export', async () => {
    const dir = await fixture({ 'nuxt.config.ts': 'const x = 1;\n' });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the default export is a bare identifier', async () => {
    const dir = await fixture({ 'nuxt.config.ts': 'export default config;\n' });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when defineNuxtConfig is called with no argument', async () => {
    const dir = await fixture({
      'nuxt.config.ts': 'export default defineNuxtConfig();\n',
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('skips spread elements and computed keys in the public block', async () => {
    const dir = await fixture({
      'nuxt.config.ts': `export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      ...base,
      ['apiBase']: '/api',
    },
  },
})`,
    });
    const issues = await checkNoSecretInPublicRuntimeConfig(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });
});
