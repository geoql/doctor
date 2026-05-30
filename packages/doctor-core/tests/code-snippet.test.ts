import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { attachCodeSnippets } from '../src/code-snippet.js';
import type { Diagnostic } from '../src/types.js';

function diag(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    file: '/nope/missing.vue',
    line: 1,
    column: 1,
    ruleId: 'r',
    severity: 'error',
    message: 'm',
    source: 'template',
    ...overrides,
  };
}

describe('attachCodeSnippets', () => {
  it('returns an empty array for no diagnostics', async () => {
    expect(await attachCodeSnippets([])).toEqual([]);
  });

  it('reads and trims the offending source line', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-snip-'));
    const file = join(dir, 'a.vue');
    await writeFile(file, 'line one\n    indented two\nline three\n');
    const [first, second] = await attachCodeSnippets([
      diag({ file, line: 1 }),
      diag({ file, line: 2 }),
    ]);
    expect(first?.codeSnippet).toBe('line one');
    expect(second?.codeSnippet).toBe('indented two');
  });

  it('caches reads per file across multiple diagnostics', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-snip-'));
    const file = join(dir, 'b.vue');
    await writeFile(file, 'alpha\nbeta\n');
    const out = await attachCodeSnippets([
      diag({ file, line: 1 }),
      diag({ file, line: 2 }),
    ]);
    expect(out.map((d) => d.codeSnippet)).toEqual(['alpha', 'beta']);
  });

  it('leaves codeSnippet unset when the line is out of range', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-snip-'));
    const file = join(dir, 'c.vue');
    await writeFile(file, 'only line\n');
    const [only] = await attachCodeSnippets([diag({ file, line: 99 })]);
    expect(only?.codeSnippet).toBeUndefined();
  });

  it('leaves codeSnippet unset when the file cannot be read', async () => {
    const [only] = await attachCodeSnippets([
      diag({ file: '/does/not/exist.vue', line: 1 }),
    ]);
    expect(only?.codeSnippet).toBeUndefined();
  });
});
