import { describe, expect, it } from 'vitest';
import { noUseStateForServerData } from '../src/rules/nuxt/ai-slop/no-useState-for-server-data.js';
import { runRule } from './run-rule.js';

const rule = noUseStateForServerData;

describe('ai-slop/no-useState-for-server-data', () => {
  it('fires when useState initializer contains $fetch', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', () => $fetch('/api/users'));`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('useFetch');
  });

  it('fires when useState initializer contains fetch', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', () => fetch('/api/users'));`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when useState initializer contains await', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', async () => { return await $fetch('/api'); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when useState initializer has no fetch/await', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', () => localStorage.getItem('x'));`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when useState has no initializer function', () => {
    const reports = runRule(rule, `const u = useState('u');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useState with non-function initializer', () => {
    const reports = runRule(rule, `const u = useState('u', null);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the initializer calls an unrelated named function', () => {
    // Covers the "callee is an Identifier but neither $fetch nor fetch" branch —
    // the rule must only flag real data-fetching calls, not any function call.
    const reports = runRule(
      rule,
      `const u = useState('u', () => computeDefault());`,
    );
    expect(reports).toEqual([]);
  });

  it('fires when initializer body has an array with a hole alongside a fetch', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', () => { const a = [, $fetch('/api')]; return a; });`,
    );
    expect(reports).toHaveLength(1);
  });

  // #234: containsFetchOrAwait must scan the initializer's own subtree only.
  // Walking a node's `parent` back-reference climbed out to Program and scanned
  // every sibling statement, so any await/$fetch anywhere in the file fired.
  describe('does not scan beyond the initializer (#234)', () => {
    it('does NOT fire when an unrelated await follows in the same file', () => {
      const reports = runRule(
        rule,
        [
          `import { useQuery } from '@tanstack/vue-query';`,
          `export function useThing() {`,
          `  const selected = useState<string | null>('thing-selected', () => null);`,
          `  const query = useQuery({`,
          `    queryKey: ['thing'],`,
          `    queryFn: async () => await $fetch('/api/thing'),`,
          `  });`,
          `  return { selected, query };`,
          `}`,
        ].join('\n'),
      );
      expect(reports).toEqual([]);
    });

    it('does NOT fire when an unrelated $fetch precedes the useState', () => {
      const reports = runRule(
        rule,
        [
          `async function other() { await $fetch('/api/other'); }`,
          `const u = useState('u', () => null);`,
        ].join('\n'),
      );
      expect(reports).toEqual([]);
    });

    it('does NOT fire when an unrelated await lives in a sibling function', () => {
      const reports = runRule(
        rule,
        [
          `function a() { return useState('a', () => null); }`,
          `async function b() { await $fetch('/api'); }`,
        ].join('\n'),
      );
      expect(reports).toEqual([]);
    });

    it('still fires when the fetch is nested inside the initializer body', () => {
      const reports = runRule(
        rule,
        `const u = useState('u', () => { try { return $fetch('/api'); } catch { return null; } });`,
      );
      expect(reports).toHaveLength(1);
    });
  });
});
