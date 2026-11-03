import { describe, expect, it } from 'vite-plus/test';
import { parseWarningExitCode, resolveExitCode } from '../src/exit-code.js';

describe('parseWarningExitCode', () => {
  it.each(['2', '78', '255', 42])('accepts %s', (value) => {
    expect(parseWarningExitCode(value)).toBe(Number(value));
  });

  it.each(['0', '1', '256', '-3', '2.5', 'abc', '', '1e2'])(
    'rejects %s',
    (value) => {
      expect(() => parseWarningExitCode(value)).toThrow(
        /--warning-exit-code must be an integer from 2 to 255/,
      );
    },
  );
});

describe('resolveExitCode', () => {
  const base = { exitCode: 0 as const, errorCount: 0, warnCount: 0 };

  it('returns report.exitCode when no warning code is configured', () => {
    expect(
      resolveExitCode(
        { ...base, exitCode: 1, errorCount: 1 },
        { failOn: 'error' },
      ),
    ).toBe(1);
    expect(
      resolveExitCode({ ...base, warnCount: 3 }, { failOn: 'error' }),
    ).toBe(0);
  });

  it('keeps a crashed pass at 2', () => {
    expect(
      resolveExitCode(
        { ...base, exitCode: 2, warnCount: 1 },
        { failOn: 'error', warningExitCode: 9 },
      ),
    ).toBe(2);
  });

  it('keeps errors at 1', () => {
    expect(
      resolveExitCode(
        { exitCode: 1, errorCount: 1, warnCount: 4 },
        { failOn: 'warn', warningExitCode: 9 },
      ),
    ).toBe(1);
  });

  it('uses the warning code for warnings-only runs (non-blocking and blocking)', () => {
    expect(
      resolveExitCode(
        { ...base, warnCount: 2 },
        { failOn: 'error', warningExitCode: 9 },
      ),
    ).toBe(9);
    expect(
      resolveExitCode(
        { exitCode: 1, errorCount: 0, warnCount: 2 },
        { failOn: 'warn', warningExitCode: 78 },
      ),
    ).toBe(78);
  });

  it('stays advisory with failOn none', () => {
    expect(
      resolveExitCode(
        { ...base, warnCount: 2 },
        { failOn: 'none', warningExitCode: 9 },
      ),
    ).toBe(0);
  });

  it('exits 0 on a clean run', () => {
    expect(resolveExitCode(base, { failOn: 'error', warningExitCode: 9 })).toBe(
      0,
    );
  });
});
