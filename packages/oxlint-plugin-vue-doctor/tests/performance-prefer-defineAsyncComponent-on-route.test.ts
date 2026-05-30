import { describe, expect, it } from 'vitest';
import { preferDefineAsyncComponentOnRoute } from '../src/rules/performance/prefer-defineAsyncComponent-on-route.js';
import { runRule } from './run-rule.js';

const rule = preferDefineAsyncComponentOnRoute;

describe('performance/prefer-defineAsyncComponent-on-route', () => {
  it('fires on a route record whose component is a bare identifier', () => {
    const reports = runRule(
      rule,
      `const routes = [{ path: '/', component: Home }];`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('lazy-load the route');
    expect(reports[0]!.message).toContain(
      'https://vuejs.org/guide/components/async.html',
    );
  });

  it('fires once per route record across multiple records', () => {
    const reports = runRule(
      rule,
      `[{ path: '/a', component: A }, { path: '/b', component: B }];`,
    );
    expect(reports).toHaveLength(2);
  });

  it('fires inside a createRouter call', () => {
    const reports = runRule(
      rule,
      `createRouter({ routes: [{ path: '/', component: Foo }] });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a string-literal component key', () => {
    const reports = runRule(
      rule,
      `const routes = [{ path: '/', 'component': Home }];`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on an arrow returning a dynamic import', () => {
    const reports = runRule(
      rule,
      `const routes = [{ path: '/', component: () => import('./Foo.vue') }];`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineAsyncComponent', () => {
    const reports = runRule(
      rule,
      `const routes = [{ path: '/', component: defineAsyncComponent(() => import('./Foo.vue')) }];`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the component value is a string literal', () => {
    const reports = runRule(rule, `const routes = [{ component: 'Foo' }];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the component value is an inline object', () => {
    const reports = runRule(
      rule,
      `const routes = [{ component: { template: '<div/>' } }];`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the component value is a member expression', () => {
    const reports = runRule(
      rule,
      `const routes = [{ component: someObj.Foo }];`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a computed component key', () => {
    const reports = runRule(rule, `const routes = [{ [component]: Foo }];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a shorthand component property', () => {
    const reports = runRule(rule, `const routes = [{ component }];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the key is not component', () => {
    const reports = runRule(rule, `const routes = [{ path: Home }];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-component string-literal key', () => {
    const reports = runRule(rule, `const routes = [{ 'name': Home }];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an empty file', () => {
    const reports = runRule(rule, ``);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a file without any property nodes', () => {
    const reports = runRule(rule, `const x = 1; doThing(x);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an object expression with no component property', () => {
    const reports = runRule(rule, `const o = { path: '/', name: 'home' };`);
    expect(reports).toEqual([]);
  });
});
