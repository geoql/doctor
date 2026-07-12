import { describe, expect, it } from 'vitest';
import * as barrel from '../src/index.js';

describe('package barrel', () => {
  it('exposes the package entry surface', () => {
    expect(Object.keys(barrel).length).toBeGreaterThan(0);
  });
});
