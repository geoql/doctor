import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyInlineDisables } from '../../src/disables/apply.js';
import type { Diagnostic } from '../../src/types.js';

let dir: string;

function write(name: string, content: string): string {
  const filePath = join(dir, name);
  writeFileSync(filePath, content);
  return filePath;
}

function diag(file: string, line: number, ruleId: string): Diagnostic {
  return {
    file,
    line,
    column: 1,
    ruleId,
    severity: 'error',
    message: 'm',
    source: 'template',
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'doctor-disables-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('node:fs');
  vi.resetModules();
  rmSync(dir, { recursive: true, force: true });
});

describe('applyInlineDisables', () => {
  it('returns the input unchanged when respect is false', () => {
    const file = write('a.vue', '<template><li v-for="i" /></template>\n');
    const diags = [diag(file, 1, 'vue-doctor/template/v-for-has-key')];
    const result = applyInlineDisables(diags, { respect: false });
    expect(result).toBe(diags);
  });

  it('drops a diagnostic on the line after a bare disable-next-line', () => {
    const file = write(
      'a.vue',
      [
        '<template>',
        '  <!-- doctor-disable-next-line -->',
        '  <li v-for="i in items">{{ i }}</li>',
        '</template>',
      ].join('\n'),
    );
    const diags = [diag(file, 3, 'vue-doctor/template/v-for-has-key')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual([]);
  });

  it('keeps a diagnostic when the disable-next-line targets a different line', () => {
    const file = write(
      'a.vue',
      [
        '<template>',
        '  <!-- doctor-disable-next-line -->',
        '  <div />',
        '  <li v-for="i in items">{{ i }}</li>',
        '</template>',
      ].join('\n'),
    );
    const diags = [diag(file, 4, 'vue-doctor/template/v-for-has-key')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual(diags);
  });

  it('suppresses only listed rules and keeps unlisted ones', () => {
    const file = write(
      'a.vue',
      ['<!-- doctor-disable-next-line v-for-has-key -->', 'target'].join('\n'),
    );
    const suppressed = diag(file, 2, 'vue-doctor/template/v-for-has-key');
    const kept = diag(file, 2, 'vue-doctor/reactivity/watch-without-cleanup');
    const result = applyInlineDisables([suppressed, kept], { respect: true });
    expect(result).toEqual([kept]);
  });

  it('matches a rule token by exact id, trailing segment, and bare last segment', () => {
    const file = write(
      'a.vue',
      [
        '// doctor-disable-next-line oxlint/no-debugger',
        'a',
        '// doctor-disable-next-line reactivity/watch-without-cleanup',
        'b',
        '// doctor-disable-next-line v-for-has-key',
        'c',
      ].join('\n'),
    );
    const exact = diag(file, 2, 'oxlint/no-debugger');
    const segment = diag(
      file,
      4,
      'vue-doctor/reactivity/watch-without-cleanup',
    );
    const bare = diag(file, 6, 'vue-doctor/template/v-for-has-key');
    const result = applyInlineDisables([exact, segment, bare], {
      respect: true,
    });
    expect(result).toEqual([]);
  });

  it('does not match a token that is only a substring of a path segment', () => {
    const file = write(
      'a.vue',
      ['// doctor-disable-next-line key', 'target'].join('\n'),
    );
    const diags = [diag(file, 2, 'vue-doctor/template/v-for-has-key')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual(diags);
  });

  it('suppresses diagnostics inside a block disable range', () => {
    const file = write(
      's.ts',
      [
        'const a = 1;',
        '// doctor-disable',
        'const b = 2;',
        'const c = 3;',
        '// doctor-enable',
        'const d = 4;',
      ].join('\n'),
    );
    const inside = diag(file, 3, 'oxlint/no-unused');
    const alsoInside = diag(file, 4, 'oxlint/no-unused');
    const outside = diag(file, 6, 'oxlint/no-unused');
    const result = applyInlineDisables([inside, alsoInside, outside], {
      respect: true,
    });
    expect(result).toEqual([outside]);
  });

  it('suppresses a same-line diagnostic via disable-line', () => {
    const file = write(
      's.ts',
      'const x = 1; // doctor-disable-line oxlint/no-unused\n',
    );
    const diags = [diag(file, 1, 'oxlint/no-unused')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual([]);
  });

  it('keeps a diagnostic whose rule is not listed in a disable-line', () => {
    const file = write(
      's.ts',
      'const x = 1; // doctor-disable-line oxlint/no-unused\n',
    );
    const diags = [diag(file, 1, 'oxlint/no-debugger')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual(diags);
  });

  it('keeps a diagnostic on a different line than a disable-line', () => {
    const file = write(
      's.ts',
      ['const x = 1; // doctor-disable-line', 'const y = 2;'].join('\n'),
    );
    const diags = [diag(file, 2, 'oxlint/no-unused')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual(diags);
  });

  it('handles diagnostics across multiple files independently', () => {
    const clean = write('clean.vue', '<template><div /></template>\n');
    const dirty = write(
      'dirty.vue',
      ['<!-- doctor-disable-next-line -->', 'target'].join('\n'),
    );
    const keptDiag = diag(clean, 1, 'vue-doctor/template/v-for-has-key');
    const droppedDiag = diag(dirty, 2, 'vue-doctor/template/v-for-has-key');
    const result = applyInlineDisables([keptDiag, droppedDiag], {
      respect: true,
    });
    expect(result).toEqual([keptDiag]);
  });

  it('reads each file at most once even with many diagnostics', async () => {
    const file = write('a.vue', ['line 1', 'line 2', 'line 3'].join('\n'));
    const reads: string[] = [];
    vi.resetModules();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readFileSync: (
          path: Parameters<typeof actual.readFileSync>[0],
          ...rest: unknown[]
        ) => {
          if (path === file) reads.push(String(path));
          return (
            actual.readFileSync as (
              ...a: [Parameters<typeof actual.readFileSync>[0], ...unknown[]]
            ) => ReturnType<typeof actual.readFileSync>
          )(path, ...rest);
        },
      };
    });
    const { applyInlineDisables: applyMocked } =
      await import('../../src/disables/apply.js');
    applyMocked(
      [diag(file, 1, 'r/a'), diag(file, 2, 'r/b'), diag(file, 3, 'r/c')],
      { respect: true },
    );
    expect(reads).toHaveLength(1);
  });

  it('keeps diagnostics for a file that cannot be read', () => {
    const missing = join(dir, 'does-not-exist.vue');
    const diags = [diag(missing, 1, 'vue-doctor/template/v-for-has-key')];
    const result = applyInlineDisables(diags, { respect: true });
    expect(result).toEqual(diags);
  });
});
