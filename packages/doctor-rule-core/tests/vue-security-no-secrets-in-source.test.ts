import { describe, expect, it } from 'vitest';
import { noSecretsInSource } from '../src/rules/vue/security/no-secrets-in-source.js';
import { runRule } from './run-rule.js';

const rule = noSecretsInSource;

describe('security/no-secrets-in-source', () => {
  it('fires on a high-signal secret literal (sk- prefix)', () => {
    const reports = runRule(rule, `const x = 'sk-live-abc123xyz789def';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('secret');
  });

  it('fires on a GitHub token literal', () => {
    expect(
      runRule(rule, `const t = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';`),
    ).toHaveLength(1);
  });

  it('fires on an AWS access key id literal', () => {
    expect(runRule(rule, `const k = 'AKIAIOSFODNN7EXAMPLE';`)).toHaveLength(1);
  });

  it('fires on a secret-named variable with a string value', () => {
    expect(
      runRule(rule, `const apiSecret = 'super-secret-token';`),
    ).toHaveLength(1);
  });

  it('fires on a secret-named object property with a string value', () => {
    expect(
      runRule(rule, `const c = { apiKey: 'longplaintextvalue123' };`),
    ).toHaveLength(1);
  });

  it('does NOT double-count a secret-named var holding a prefixed secret', () => {
    expect(
      runRule(rule, `const apiKey = 'sk-live-abc123xyz789def';`),
    ).toHaveLength(1);
  });

  it('does NOT fire on a non-secret-named short string', () => {
    expect(runRule(rule, `const theme = 'dark';`)).toEqual([]);
  });

  it('does NOT fire on a secret-named var reading from env (no string literal)', () => {
    expect(
      runRule(rule, `const apiKey = import.meta.env.VITE_API_KEY;`),
    ).toEqual([]);
  });

  it('does NOT fire on a secret-named property with a non-string value', () => {
    expect(runRule(rule, `const c = { token: getToken() };`)).toEqual([]);
  });

  it('does NOT fire on a secret-named var with a short value', () => {
    expect(runRule(rule, `const password = 'x';`)).toEqual([]);
  });

  it('does NOT fire on a secret-named var with no initializer', () => {
    expect(runRule(rule, `let apiKey;`)).toEqual([]);
  });

  it('does NOT fire on a non-string literal', () => {
    expect(runRule(rule, `const x = 123456789;`)).toEqual([]);
  });

  it('does NOT fire on a destructuring declarator (non-identifier id)', () => {
    expect(runRule(rule, `const { apiKey } = config;`)).toEqual([]);
  });

  it('does NOT fire on a computed object key', () => {
    expect(
      runRule(rule, `const c = { [dynamic]: 'longplaintextvalue123' };`),
    ).toEqual([]);
  });

  it('fires on a string-literal secret-named object key', () => {
    expect(
      runRule(rule, `const c = { 'apiKey': 'longplaintextvalue123' };`),
    ).toHaveLength(1);
  });
});
