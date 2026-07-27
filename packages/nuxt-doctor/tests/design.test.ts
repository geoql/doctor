import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runDesignScan } from '../src/design.js';
import { run } from '../src/cli.js';

const root = mkdtempSync(join(tmpdir(), 'nd-design-'));

function scaffoldVueApp(): string {
  const dir = join(root, 'app');
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'design-fixture',
      dependencies: { vue: '^3.5.0' },
    }),
  );
  writeFileSync(
    join(dir, 'src', 'App.vue'),
    '<template>\n  <div>\n    <img src="/x.png" />\n  </div>\n</template>\n',
  );
  return dir;
}

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runDesignScan', () => {
  it('returns a scored design report with categories', async () => {
    const dir = scaffoldVueApp();
    const result = await runDesignScan(dir, { format: 'json' });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output) as {
      score: number | null;
      categories: Array<{ id: string }>;
      findings: unknown[];
    };
    expect(parsed.categories.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it('renders human output by default', async () => {
    const dir = scaffoldVueApp();
    const result = await runDesignScan(dir, {});
    expect(result.exitCode).toBe(0);
    expect(result.output.length).toBeGreaterThan(0);
  });

  it('renders the agent prompt format', async () => {
    const dir = scaffoldVueApp();
    const result = await runDesignScan(dir, { format: 'agent' });
    expect(result.exitCode).toBe(0);
    expect(result.output.length).toBeGreaterThan(0);
  });

  it('rejects an unknown format with exit 2', async () => {
    const dir = scaffoldVueApp();
    await expect(runDesignScan(dir, { format: 'yaml' })).rejects.toThrowError(
      /format/,
    );
  });

  it('gates on --fail-under when the score is below it', async () => {
    const dir = scaffoldVueApp();
    const result = await runDesignScan(dir, {
      format: 'json',
      failUnder: 101,
    });
    expect(result.exitCode).toBe(1);
  });

  it.each([Number.NaN, -1, 102])(
    'rejects invalid --fail-under %s',
    async (failUnder) => {
      const dir = scaffoldVueApp();
      await expect(runDesignScan(dir, { failUnder })).rejects.toThrowError(
        /fail-under/,
      );
    },
  );

  it('does not gate when the score is at or above --fail-under', async () => {
    const dir = scaffoldVueApp();
    const result = await runDesignScan(dir, { format: 'json', failUnder: 0 });
    expect(result.exitCode).toBe(0);
  });

  it('runs through the CLI design command and writes output', async () => {
    const dir = scaffoldVueApp();
    const out: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      out.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.exitCode = undefined;
    try {
      await run(['node', 'nuxt-doctor', 'design', dir, '--format', 'json']);
    } finally {
      process.stdout.write = write;
    }
    expect(out.join('')).toContain('score');
    process.exitCode = undefined;
  });

  it('exits 2 from the CLI design command on an invalid format', async () => {
    const dir = scaffoldVueApp();
    const errs: string[] = [];
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      errs.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    process.exitCode = undefined;
    try {
      await run(['node', 'nuxt-doctor', 'design', dir, '--format', 'bogus']);
    } finally {
      process.stderr.write = write;
    }
    expect(process.exitCode).toBe(2);
    expect(errs.join('')).toContain('--format must be');
    process.exitCode = undefined;
  });
});
