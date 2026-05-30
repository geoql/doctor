import { describe, expect, it } from 'vitest';
import {
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from '../../src/dead-code/errors.js';

describe('DeadCodeTimeoutError', () => {
  it('sets name and message', () => {
    const err = new DeadCodeTimeoutError(5000);
    expect(err.name).toBe('DeadCodeTimeoutError');
    expect(err.message).toBe('Dead-code analysis timed out after 5000ms');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('DeadCodeImportFailed', () => {
  it('sets name and message from Error cause', () => {
    const cause = new Error('module not found');
    const err = new DeadCodeImportFailed(cause);
    expect(err.name).toBe('DeadCodeImportFailed');
    expect(err.message).toBe('Failed to import knip: module not found');
    expect(err).toBeInstanceOf(Error);
  });

  it('sets default message when cause is not an Error', () => {
    const err = new DeadCodeImportFailed('string cause');
    expect(err.name).toBe('DeadCodeImportFailed');
    expect(err.message).toBe('Failed to import knip');
  });

  it('sets default message when no cause', () => {
    const err = new DeadCodeImportFailed();
    expect(err.name).toBe('DeadCodeImportFailed');
    expect(err.message).toBe('Failed to import knip');
  });
});
