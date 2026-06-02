import { describe, expect, it } from 'vitest';
import { run } from '../src/index.js';

describe('index entrypoint', () => {
  it('re-exports run as a function', () => {
    expect(typeof run).toBe('function');
  });
});
