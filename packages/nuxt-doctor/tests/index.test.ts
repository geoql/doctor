import { describe, expect, it } from 'vite-plus/test';
import { run } from '../src/index.js';

describe('index entrypoint', () => {
  it('re-exports run as a function', () => {
    expect(typeof run).toBe('function');
  });
});
