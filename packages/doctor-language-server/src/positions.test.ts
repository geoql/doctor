import { describe, expect, it } from 'vitest';
import {
  rangeFromLineColumn,
  rangesOverlap,
  toZeroBasedPosition,
} from './positions.js';

describe('toZeroBasedPosition', () => {
  it('converts 1-indexed line/column to 0-indexed', () => {
    expect(toZeroBasedPosition(9, 13)).toEqual({ line: 8, character: 12 });
  });

  it('clamps zero/falsy line and column to the document start', () => {
    expect(toZeroBasedPosition(0, 0)).toEqual({ line: 0, character: 0 });
    expect(toZeroBasedPosition(1, 1)).toEqual({ line: 0, character: 0 });
  });
});

describe('rangeFromLineColumn', () => {
  it('uses explicit endLine/endColumn when present', () => {
    expect(rangeFromLineColumn(null, 2, 3, 2, 9)).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 8 },
    });
  });

  it('falls back to a single-character span when no text and no end', () => {
    expect(rangeFromLineColumn(null, 9, 13)).toEqual({
      start: { line: 8, character: 12 },
      end: { line: 8, character: 13 },
    });
  });

  it('extends the end to the end of the target line when text is provided', () => {
    const text = 'alpha\nconst beta = 2;\ngamma';
    const range = rangeFromLineColumn(text, 2, 7);
    expect(range.start).toEqual({ line: 1, character: 6 });
    expect(range.end.character).toBe('const beta = 2;'.length);
  });

  it('guarantees the end is at least one past the start on a short line', () => {
    const text = 'ab\n';
    const range = rangeFromLineColumn(text, 1, 5);
    expect(range.end.character).toBeGreaterThan(range.start.character);
  });

  it('strips a trailing carriage return when measuring the line end', () => {
    const text = 'const x = 1;\r\nnext';
    const range = rangeFromLineColumn(text, 1, 1);
    expect(range.end).toEqual({ line: 0, character: 'const x = 1;'.length });
  });

  it('treats a missing line in the text as empty', () => {
    const range = rangeFromLineColumn('only-one-line', 5, 2);
    expect(range.start).toEqual({ line: 4, character: 1 });
    expect(range.end).toEqual({ line: 4, character: 2 });
  });
});

describe('rangesOverlap', () => {
  it('treats touching endpoints as overlapping', () => {
    const first = {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 5 },
    };
    const second = {
      start: { line: 0, character: 5 },
      end: { line: 0, character: 10 },
    };
    expect(rangesOverlap(first, second)).toBe(true);
  });

  it('returns false for disjoint ranges', () => {
    const first = {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 5 },
    };
    const second = {
      start: { line: 0, character: 6 },
      end: { line: 0, character: 10 },
    };
    expect(rangesOverlap(first, second)).toBe(false);
  });

  it('detects overlap across lines', () => {
    const first = {
      start: { line: 0, character: 0 },
      end: { line: 3, character: 0 },
    };
    const second = {
      start: { line: 1, character: 2 },
      end: { line: 1, character: 4 },
    };
    expect(rangesOverlap(first, second)).toBe(true);
  });
});
