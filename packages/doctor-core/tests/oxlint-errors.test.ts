import { describe, expect, it } from 'vitest';
import {
  OxlintOutputTooLarge,
  OxlintSpawnFailed,
} from '../src/oxlint/errors.js';

describe('OxlintSpawnFailed', () => {
  it('is an Error with a name and a message carrying the exit code and stderr tail', () => {
    const err = new OxlintSpawnFailed(7, 'boom on the wire');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('OxlintSpawnFailed');
    expect(err.message).toContain('7');
    expect(err.message).toContain('boom on the wire');
  });

  it('describes a null exit code without throwing', () => {
    const err = new OxlintSpawnFailed(null, '');
    expect(err.message).toContain('null');
  });

  it('truncates a long stderr to a tail', () => {
    const long = 'x'.repeat(5000);
    const err = new OxlintSpawnFailed(1, long);
    expect(err.message.length).toBeLessThan(long.length);
    expect(err.message).toContain('x');
  });
});

describe('OxlintOutputTooLarge', () => {
  it('is an Error with a name and a message carrying the byte cap', () => {
    const err = new OxlintOutputTooLarge(1024);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('OxlintOutputTooLarge');
    expect(err.message).toContain('1024');
  });
});
