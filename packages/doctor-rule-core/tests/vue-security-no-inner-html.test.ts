import { describe, expect, it } from 'vitest';
import { noInnerHtml } from '../src/rules/vue/security/no-inner-html.js';
import { runRule } from './run-rule.js';

const rule = noInnerHtml;

describe('security/no-inner-html', () => {
  it('fires on an innerHTML assignment', () => {
    const reports = runRule(rule, `el.innerHTML = userContent;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('XSS');
  });

  it('fires on a deep member innerHTML assignment', () => {
    const reports = runRule(rule, `ref.value.innerHTML = html;`);
    expect(reports).toHaveLength(1);
  });

  it('fires on an outerHTML assignment', () => {
    const reports = runRule(rule, `node.outerHTML = markup;`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on textContent assignment', () => {
    expect(runRule(rule, `el.textContent = userContent;`)).toEqual([]);
  });

  it('does NOT fire on reading innerHTML', () => {
    expect(runRule(rule, `const html = el.innerHTML;`)).toEqual([]);
  });

  it('does NOT fire on a computed member assignment', () => {
    expect(runRule(rule, `el[prop] = value;`)).toEqual([]);
  });

  it('does NOT fire on a plain identifier assignment', () => {
    expect(runRule(rule, `html = userContent;`)).toEqual([]);
  });

  it('surfaces the MDN security docs URL', () => {
    const reports = runRule(rule, `el.innerHTML = x;`);
    expect(reports[0]!.message).toContain('developer.mozilla.org');
  });
});
