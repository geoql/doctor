import { describe, expect, it } from 'vitest';
import { markdownItUnsanitizedHtml } from '../src/rules/vue/security/markdown-it-unsanitized-html.js';
import { runRule } from './run-rule.js';

const rule = markdownItUnsanitizedHtml;

describe('security/markdown-it-unsanitized-html', () => {
  it('fires on new MarkdownIt({ html: true }) with no sanitizer', () => {
    const reports = runRule(
      rule,
      `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ html: true });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('sanitiz');
  });

  it('fires on the callable factory MarkdownIt({ html: true })', () => {
    const reports = runRule(
      rule,
      `import MarkdownIt from 'markdown-it';\nconst md = MarkdownIt({ html: true });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on md.set({ html: true })', () => {
    const reports = runRule(
      rule,
      `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt();\nmd.set({ html: true });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when html is not enabled', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt();`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire when html is explicitly false', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ html: false });`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire when a sanitizer is imported (dompurify)', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nimport DOMPurify from 'dompurify';\nconst md = new MarkdownIt({ html: true });\nconst clean = DOMPurify.sanitize(md.render(src));`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire when sanitize-html is imported', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nimport sanitizeHtml from 'sanitize-html';\nconst md = new MarkdownIt({ html: true });`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire when a markdown-it sanitizer plugin is used', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nimport sanitizer from 'markdown-it-sanitizer';\nconst md = new MarkdownIt({ html: true }).use(sanitizer);`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire on an unrelated constructor with html: true', () => {
    expect(runRule(rule, `const opts = new Renderer({ html: true });`)).toEqual(
      [],
    );
  });

  it('does NOT fire on a non-markdown-it set() call', () => {
    expect(
      runRule(rule, `const cfg = something;\ncfg.set({ html: true });`),
    ).toEqual([]);
  });

  it('does NOT fire when html option value is a non-literal', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ html: flag });`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire when the options object has no html property', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ linkify: true, typographer: true });`,
      ),
    ).toEqual([]);
  });

  it('fires when html is enabled via a string-literal key', () => {
    const reports = runRule(
      rule,
      `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ 'html': true });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when the options key is a computed/non-identifier form', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst k = 'html';\nconst md = new MarkdownIt({ [k]: true });`,
      ),
    ).toEqual([]);
  });

  it('does NOT track a named (non-default) import from markdown-it', () => {
    expect(
      runRule(
        rule,
        `import { MarkdownIt } from 'markdown-it';\nconst md = new MarkdownIt({ html: true });`,
      ),
    ).toEqual([]);
  });

  it('does NOT crash on a destructured declarator init', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst { render } = new MarkdownIt({ html: true });`,
      ),
    ).toHaveLength(1);
  });

  it('does NOT fire on a computed-property member call like md[fn]({ html: true })', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt();\nmd[fn]({ html: true });`,
      ),
    ).toEqual([]);
  });

  it('fires past a spread element in the options object', () => {
    const reports = runRule(
      rule,
      `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ ...base, html: true });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when the html-looking key is a member expression', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt({ [a.b]: true });`,
      ),
    ).toEqual([]);
  });

  it('does NOT fire on a string-literal computed member call md["set"]({ html: true })', () => {
    expect(
      runRule(
        rule,
        `import MarkdownIt from 'markdown-it';\nconst md = new MarkdownIt();\nmd['set']({ html: true });`,
      ),
    ).toEqual([]);
  });
});
