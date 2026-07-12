import { describe, expect, it } from 'vitest';
import * as barrel from '../src/index.js';

describe('package barrel', () => {
  it('re-exports the plugin', () => {
    expect(barrel.plugin).toBeDefined();
    expect(barrel.default).toBeDefined();
  });
});
