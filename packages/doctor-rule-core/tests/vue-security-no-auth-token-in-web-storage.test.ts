import { describe, expect, it } from 'vitest';
import { noAuthTokenInWebStorage } from '../src/rules/vue/security/no-auth-token-in-web-storage.js';
import { runRule } from './run-rule.js';

const rule = noAuthTokenInWebStorage;

describe('security/no-auth-token-in-web-storage', () => {
  it('fires on localStorage.setItem with a token key', () => {
    const reports = runRule(rule, `localStorage.setItem('accessToken', t);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('HttpOnly');
  });

  it('fires on sessionStorage.setItem with a jwt key', () => {
    expect(runRule(rule, `sessionStorage.setItem('jwt', t);`)).toHaveLength(1);
  });

  it('fires on a sessionStorage member assignment with a token key', () => {
    expect(runRule(rule, `sessionStorage.authToken = t;`)).toHaveLength(1);
  });

  it('fires on a computed storage assignment with a secret key', () => {
    expect(runRule(rule, `localStorage['apiSecret'] = s;`)).toHaveLength(1);
  });

  it('does NOT fire on a non-sensitive setItem key', () => {
    expect(runRule(rule, `localStorage.setItem('theme', 'dark');`)).toEqual([]);
  });

  it('does NOT fire on getItem (read)', () => {
    expect(runRule(rule, `const t = localStorage.getItem('token');`)).toEqual(
      [],
    );
  });

  it('does NOT fire on a non-sensitive member assignment', () => {
    expect(runRule(rule, `localStorage.theme = 'dark';`)).toEqual([]);
  });

  it('does NOT fire on setItem with a non-string key', () => {
    expect(runRule(rule, `localStorage.setItem(dynKey, t);`)).toEqual([]);
  });

  it('does NOT fire on other objects setItem', () => {
    expect(runRule(rule, `store.setItem('token', t);`)).toEqual([]);
  });

  it('does NOT fire on a bare function call with a token arg', () => {
    expect(runRule(rule, `setItem('token', t);`)).toEqual([]);
  });

  it('does NOT fire on a computed storage method call', () => {
    expect(runRule(rule, `localStorage['setItem']('token', t);`)).toEqual([]);
  });

  it('does NOT fire on a plain identifier assignment', () => {
    expect(runRule(rule, `token = value;`)).toEqual([]);
  });

  it('does NOT fire on a member assignment to a non-storage object', () => {
    expect(runRule(rule, `state.authToken = t;`)).toEqual([]);
  });
});
