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

  it('fires when initializer body has an array with a hole alongside a fetch', () => {
    const reports = runRule(
      rule,
      `const u = useState('u', () => { const a = [, $fetch('/api')]; return a; });`,
    );
    expect(reports).toHaveLength(1);
  });
});
