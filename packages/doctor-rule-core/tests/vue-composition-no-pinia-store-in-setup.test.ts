import { describe, expect, it } from 'vitest';
import { noPiniaStoreInSetup } from '../src/rules/vue/composition/no-pinia-store-in-setup.js';
import { runRule } from './run-rule.js';

const rule = noPiniaStoreInSetup;

describe('composition/no-pinia-store-in-setup', () => {
  it('fires on defineStore() called inside a function declaration', () => {
    const reports = runRule(
      rule,
      `function setup() { const useS = defineStore('s', () => ({})); return useS(); }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('module scope');
  });

  it('fires on defineStore() inside an arrow function', () => {
    const reports = runRule(
      rule,
      `const setup = () => { const useS = defineStore('s', {}); return useS; };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on defineStore() inside a composable', () => {
    const reports = runRule(
      rule,
      `function useThing() { return defineStore('t', {}); }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on defineStore() at module scope', () => {
    const reports = runRule(
      rule,
      `const useS = defineStore('s', () => ({ a: 1 }));`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a useStore() call inside setup (the correct pattern)', () => {
    const reports = runRule(
      rule,
      `function setup() { const s = useCounterStore(); return s; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-defineStore call inside a function', () => {
    const reports = runRule(
      rule,
      `function setup() { const x = createPinia(); return x; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member-expression callee named defineStore', () => {
    const reports = runRule(
      rule,
      `function s() { return pinia.defineStore('s', {}); }`,
    );
    expect(reports).toEqual([]);
  });

  it('fires once per offending defineStore across nested functions', () => {
    const reports = runRule(
      rule,
      `function outer() { const a = defineStore('a', {}); function inner() { return defineStore('b', {}); } return [a, inner]; }`,
    );
    expect(reports).toHaveLength(2);
  });
});
