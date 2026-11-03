import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  attachFingerprints,
  diagnosticEvidence,
  fingerprintDiagnostic,
} from '../../src/baseline/fingerprint.js';
import type { Diagnostic } from '../../src/types.js';

function diag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: '/root/src/a.ts',
    line: 2,
    column: 3,
    ruleId: 'vue-doctor/x',
    severity: 'warn',
    message: 'msg',
    source: 'oxlint',
    ...overrides,
  };
}

describe('diagnosticEvidence', () => {
  const lines = ['first', '  const   x = 1;  ', 'third line', 'fourth'];

  it('uses the whole line for a point diagnostic, whitespace-collapsed', () => {
    expect(diagnosticEvidence(diag(), lines)).toBe('const x = 1;');
  });

  it('slices exactly the span when an end position is known', () => {
    expect(
      diagnosticEvidence(
        diag({ line: 2, column: 9, endLine: 3, endColumn: 6 }),
        lines,
      ),
    ).toBe('x = 1; third');
  });

  it('slices to end of line when the end column is unknown', () => {
    expect(
      diagnosticEvidence(diag({ line: 3, column: 7, endLine: 3 }), lines),
    ).toBe('line');
  });

  it('clamps an end line beyond the file and before the start', () => {
    expect(
      diagnosticEvidence(diag({ line: 4, column: 1, endLine: 99 }), lines),
    ).toBe('fourth');
    expect(
      diagnosticEvidence(diag({ line: 4, column: 1, endLine: 1 }), lines),
    ).toBe('fourth');
  });

  it('falls back to the message when the source is unavailable or blank', () => {
    expect(diagnosticEvidence(diag(), undefined)).toBe('msg');
    expect(diagnosticEvidence(diag({ line: 50 }), lines)).toBe('msg');
    expect(diagnosticEvidence(diag({ line: 1 }), ['   '])).toBe('msg');
  });
});

describe('fingerprintDiagnostic', () => {
  it('ignores line/column shifts but not rule, path, or evidence', () => {
    const lines = ['const x = 1;', '', 'const x = 1;'];
    const a = fingerprintDiagnostic(diag({ line: 1 }), '/root', lines);
    const shifted = fingerprintDiagnostic(
      diag({ line: 3, column: 9 }),
      '/root',
      lines,
    );
    expect(shifted).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(
      fingerprintDiagnostic(diag({ line: 1, ruleId: 'other' }), '/root', lines),
    ).not.toBe(a);
    expect(
      fingerprintDiagnostic(
        diag({ line: 1, file: '/root/src/b.ts' }),
        '/root',
        lines,
      ),
    ).not.toBe(a);
    expect(
      fingerprintDiagnostic(diag({ line: 1 }), '/root', ['const y = 2;']),
    ).not.toBe(a);
  });
});

describe('attachFingerprints', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fp-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads each file once and fingerprints every diagnostic', async () => {
    const file = join(dir, 'a.ts');
    writeFileSync(file, 'const a = 1;\nconst b = 2;\n');
    const out = await attachFingerprints(
      [
        diag({ file, line: 1 }),
        diag({ file, line: 2 }),
        diag({ file: join(dir, 'missing.ts'), line: 1 }),
      ],
      dir,
    );
    expect(out).toHaveLength(3);
    expect(out[0]!.fingerprint).not.toBe(out[1]!.fingerprint);
    expect(out[2]!.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });
});
