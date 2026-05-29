import { describe, expect, it } from 'vitest';
import { audit, format, loadAuditConfig } from '../src/index.js';

describe('package index re-exports', () => {
  it('exposes audit, loadAuditConfig and format as functions', () => {
    expect(typeof audit).toBe('function');
    expect(typeof loadAuditConfig).toBe('function');
    expect(typeof format).toBe('function');
  });
});
