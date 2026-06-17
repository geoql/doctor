import { describe, expect, it } from 'vitest';
import { preferReadonlyForInjected } from '../src/rules/vue/reactivity/prefer-readonly-for-injected.js';
import { runRule } from './run-rule.js';

const rule = preferReadonlyForInjected;

describe('reactivity/prefer-readonly-for-injected', () => {
  it('fires when an injected value has a property assigned', () => {
    const reports = runRule(rule, `const u = inject('user');\nu.name = 'x';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('readonly');
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('fires when an injected value has .value assigned', () => {
    const reports = runRule(rule, `const u = inject('user');\nu.value = 1;`);
    expect(reports).toHaveLength(1);
  });

  it('fires when an injected value is mutated with a compound assignment', () => {
    const reports = runRule(rule, `const u = inject('count');\nu.n += 1;`);
    expect(reports).toHaveLength(1);
  });

  it('fires when an injected value has a computed property assigned', () => {
    const reports = runRule(rule, `const u = inject('user');\nu[key] = 1;`);
    expect(reports).toHaveLength(1);
  });

  it('fires for each mutating array method on an injected value', () => {
    const src = `const l = inject('list');\nl.push(1);\nl.pop();\nl.splice(0, 1);\nl.shift();\nl.unshift(0);\nl.sort();\nl.reverse();`;
    expect(runRule(rule, src)).toHaveLength(7);
  });

  it('tracks multiple injected sources in one declaration', () => {
    const reports = runRule(
      rule,
      `const u = inject('user'), l = inject('list');\nu.name = 'x';\nl.push(1);`,
    );
    expect(reports).toHaveLength(2);
  });

  it('does NOT fire when an injected value is only read', () => {
    const reports = runRule(
      rule,
      `const u = inject('user');\nconst name = u.name;\nuse(u);`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-mutating method call on an injected value', () => {
    const reports = runRule(rule, `const l = inject('list');\nl.map(fn);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when mutating a non-injected object', () => {
    const reports = runRule(rule, `const o = makeState();\no.name = 'x';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a mutating method call on a non-injected object', () => {
    const reports = runRule(rule, `const l = makeList();\nl.push(1);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the init is a non-inject call', () => {
    const reports = runRule(rule, `const u = useState('user');\nu.name = 'x';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when inject is called as a member expression', () => {
    const reports = runRule(
      rule,
      `const u = ctx.inject('user');\nu.name = 'x';`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT track a destructured inject result', () => {
    const reports = runRule(
      rule,
      `const { name } = inject('user');\nname.value = 1;`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a declarator without an initializer', () => {
    const reports = runRule(rule, `let u;\nu = inject('user');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when reassigning the injected binding itself', () => {
    const reports = runRule(rule, `const u = inject('user');\nu = other;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when assigning to a nested member of an injected value', () => {
    const reports = runRule(
      rule,
      `const u = inject('user');\nu.profile.name = 'x';`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a computed mutating method call on an injected value', () => {
    const reports = runRule(rule, `const l = inject('list');\nl['push'](1);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a mutating method invoked via a nested member', () => {
    const reports = runRule(
      rule,
      `const l = inject('list');\nl.items.push(1);`,
    );
    expect(reports).toEqual([]);
  });
});
