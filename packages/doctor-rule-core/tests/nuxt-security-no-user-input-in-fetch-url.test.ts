import { describe, expect, it } from 'vitest';
import { noUserInputInFetchUrl } from '../src/rules/nuxt/security/no-user-input-in-fetch-url.js';
import { runRule } from './run-rule.js';

const rule = noUserInputInFetchUrl;

describe('security/no-user-input-in-fetch-url', () => {
  it('fires when useFetch URL is route.query.redirect', () => {
    const reports = runRule(
      rule,
      `const { data } = useFetch(route.query.redirect);`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('SSRF');
  });

  it('fires when $fetch URL is a template literal with route.query', () => {
    expect(
      runRule(rule, 'const r = $fetch(`https://${route.query.host}/api`);'),
    ).toHaveLength(1);
  });

  it('fires when useLazyFetch URL is route.params.id', () => {
    expect(runRule(rule, `useLazyFetch(route.params.id);`)).toHaveLength(1);
  });

  it('does NOT fire when route input is only in the options, not the URL', () => {
    expect(
      runRule(
        rule,
        `useFetch('/api/content', { query: { id: route.query.id } });`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire on a fixed relative path', () => {
    expect(runRule(rule, `useFetch('/api/content');`)).toEqual([]);
  });

  it('does NOT fire on $fetch with a plain non-route identifier', () => {
    expect(runRule(rule, `$fetch(endpoint);`)).toEqual([]);
  });

  it('does NOT fire on an unrelated call carrying route input', () => {
    expect(runRule(rule, `doThing(route.query.x);`)).toEqual([]);
  });

  it('does NOT fire on useFetch with no arguments', () => {
    expect(runRule(rule, `useFetch();`)).toEqual([]);
  });

  it('does NOT fire on a member-expression callee like obj.useFetch(...)', () => {
    expect(runRule(rule, `obj.useFetch(route.query.x);`)).toEqual([]);
  });

  it('does NOT fire on a template URL whose only expression is a safe identifier', () => {
    expect(runRule(rule, 'useFetch(`/api/${id}`);')).toEqual([]);
  });

  it('does NOT fire on a template URL with no expressions', () => {
    expect(runRule(rule, 'useFetch(`/api/static`);')).toEqual([]);
  });
});
