import { describe, expect, it } from 'vitest';
import { preferScriptSetupForNewFiles } from '../src/rules/composition/prefer-script-setup-for-new-files.js';
import { runRule } from './run-rule.js';

const rule = preferScriptSetupForNewFiles;

describe('composition/prefer-script-setup-for-new-files', () => {
  it('fires on export default with a setup method', () => {
    const reports = runRule(rule, `export default { setup() { return {}; } };`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('script setup');
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('fires on export default with a setup arrow property', () => {
    const reports = runRule(rule, `export default { setup: () => ({}) };`);
    expect(reports).toHaveLength(1);
  });

  it('fires on export default with a setup function-expression property', () => {
    const reports = runRule(
      rule,
      `export default { setup: function () { return {}; } };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when setup is present alongside other options', () => {
    const reports = runRule(
      rule,
      `export default { name: 'X', setup() { return {}; }, data() { return {}; } };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when there is no export default declaration', () => {
    const reports = runRule(rule, `const x = ref(0);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when export default is a function declaration', () => {
    const reports = runRule(rule, `export default function foo() {}`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an options object without setup', () => {
    const reports = runRule(rule, `export default { name: 'X', data() {} };`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an empty options object', () => {
    const reports = runRule(rule, `export default {};`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a shorthand setup reference', () => {
    const reports = runRule(rule, `export default { setup };`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when setup holds a non-function value', () => {
    const reports = runRule(rule, `export default { setup: 1 };`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a computed setup key', () => {
    const reports = runRule(
      rule,
      `export default { ['setup']() { return {}; } };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a string-literal setup key', () => {
    const reports = runRule(
      rule,
      `export default { 'setup'() { return {}; } };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a spread-only options object', () => {
    const reports = runRule(rule, `export default { ...mixin };`);
    expect(reports).toEqual([]);
  });
});
