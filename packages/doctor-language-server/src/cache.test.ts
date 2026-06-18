import { describe, expect, it } from 'vitest';
import { createVersionCache, shouldAuditVersion } from './cache.js';

describe('shouldAuditVersion', () => {
  it('audits when no version was seen before', () => {
    expect(shouldAuditVersion(undefined, 1)).toBe(true);
  });

  it('audits a strictly newer version', () => {
    expect(shouldAuditVersion(1, 2)).toBe(true);
  });

  it('skips an equal or stale version', () => {
    expect(shouldAuditVersion(2, 2)).toBe(false);
    expect(shouldAuditVersion(3, 2)).toBe(false);
  });
});

describe('createVersionCache', () => {
  it('audits a fresh document then skips its already-seen version', () => {
    const cache = createVersionCache();
    expect(cache.shouldAudit('a', 1)).toBe(true);
    cache.markAudited('a', 1);
    expect(cache.shouldAudit('a', 1)).toBe(false);
    expect(cache.shouldAudit('a', 2)).toBe(true);
  });

  it('forgets a document so a reopen re-audits', () => {
    const cache = createVersionCache();
    cache.markAudited('a', 5);
    expect(cache.shouldAudit('a', 5)).toBe(false);
    cache.forget('a');
    expect(cache.shouldAudit('a', 5)).toBe(true);
  });

  it('tracks documents independently', () => {
    const cache = createVersionCache();
    cache.markAudited('a', 3);
    expect(cache.shouldAudit('b', 1)).toBe(true);
  });
});
