import { describe, expect, it } from 'vitest';
import {
  ConfigCycleError,
  ConfigFileNotFoundError,
  InvalidConfigError,
} from '../../src/config/errors.js';

describe('ConfigFileNotFoundError', () => {
  it('sets name to ConfigFileNotFoundError', () => {
    const err = new ConfigFileNotFoundError('/no/such/file.ts');
    expect(err.name).toBe('ConfigFileNotFoundError');
  });

  it('includes the missing path in the message', () => {
    const err = new ConfigFileNotFoundError('/no/such/file.ts');
    expect(err.message).toContain('/no/such/file.ts');
  });

  it('is an instance of Error and of itself', () => {
    const err = new ConfigFileNotFoundError('/missing');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfigFileNotFoundError);
  });
});

describe('ConfigCycleError', () => {
  it('sets name to ConfigCycleError', () => {
    const err = new ConfigCycleError(['a.ts', 'b.ts', 'a.ts']);
    expect(err.name).toBe('ConfigCycleError');
  });

  it('joins the chain with arrow in the message', () => {
    const err = new ConfigCycleError(['a.ts', 'b.ts', 'a.ts']);
    expect(err.message).toContain('a.ts -> b.ts -> a.ts');
  });

  it('is an instance of Error and of itself', () => {
    const err = new ConfigCycleError(['x']);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfigCycleError);
  });
});

describe('InvalidConfigError', () => {
  it('sets name to InvalidConfigError', () => {
    const err = new InvalidConfigError('threshold: must be 0..100, got 150');
    expect(err.name).toBe('InvalidConfigError');
  });

  it('preserves the message with field path', () => {
    const err = new InvalidConfigError('threshold: must be 0..100, got 150');
    expect(err.message).toContain('threshold');
    expect(err.message).toContain('150');
  });

  it('is an instance of Error and of itself', () => {
    const err = new InvalidConfigError('bad');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(InvalidConfigError);
  });
});
