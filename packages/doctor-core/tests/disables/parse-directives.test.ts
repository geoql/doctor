import { describe, expect, it } from 'vitest';
import { parseDirectives } from '../../src/disables/parse-directives.js';

describe('parseDirectives', () => {
  it('captures an HTML block disable...enable range with no rule list (all rules)', () => {
    const text = [
      '<template>',
      '  <!-- doctor-disable -->',
      '  <li v-for="i in items">{{ i }}</li>',
      '  <!-- doctor-enable -->',
      '</template>',
    ].join('\n');
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([{ start: 2, end: 4, rules: [] }]);
    expect(set.nextLine).toEqual([]);
    expect(set.sameLine).toEqual([]);
  });

  it('captures an HTML disable-next-line with no rule list targeting the next line', () => {
    const text = [
      '<template>',
      '  <!-- doctor-disable-next-line -->',
      '  <li v-for="i in items">{{ i }}</li>',
      '</template>',
    ].join('\n');
    const set = parseDirectives(text);
    expect(set.nextLine).toEqual([{ line: 3, rules: [] }]);
    expect(set.blocks).toEqual([]);
    expect(set.sameLine).toEqual([]);
  });

  it('parses an HTML disable-next-line rule list, trimming whitespace', () => {
    const text =
      '<!-- doctor-disable-next-line v-for-has-key, reactivity/watch-without-cleanup -->';
    const set = parseDirectives(text);
    expect(set.nextLine).toEqual([
      {
        line: 2,
        rules: ['v-for-has-key', 'reactivity/watch-without-cleanup'],
      },
    ]);
  });

  it('captures a script block disable...enable range', () => {
    const text = [
      'const a = 1;',
      '// doctor-disable',
      'const b = 2;',
      '// doctor-enable',
      'const c = 3;',
    ].join('\n');
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([{ start: 2, end: 4, rules: [] }]);
  });

  it('captures a script disable-next-line directive', () => {
    const text = ['// doctor-disable-next-line', 'const x = 1;'].join('\n');
    const set = parseDirectives(text);
    expect(set.nextLine).toEqual([{ line: 2, rules: [] }]);
  });

  it('captures a script disable-line directive targeting the same line', () => {
    const text = 'const x = 1; // doctor-disable-line v-for-has-key';
    const set = parseDirectives(text);
    expect(set.sameLine).toEqual([{ line: 1, rules: ['v-for-has-key'] }]);
  });

  it('drops empty tokens from a rule list with a trailing comma', () => {
    const text = '<!-- doctor-disable a/b, , c -->';
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([{ start: 1, end: 1, rules: ['a/b', 'c'] }]);
  });

  it('extends an unclosed block disable to the end of the file', () => {
    const text = ['line 1', '// doctor-disable', 'line 3', 'line 4'].join('\n');
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([{ start: 2, end: 4, rules: [] }]);
  });

  it('ignores a stray enable with no open block', () => {
    const text = ['line 1', '// doctor-enable', 'line 3'].join('\n');
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([]);
  });

  it('keeps the first open block and ignores a nested disable', () => {
    const text = [
      '// doctor-disable first',
      'body',
      '// doctor-disable second',
      'more',
      '// doctor-enable',
    ].join('\n');
    const set = parseDirectives(text);
    expect(set.blocks).toEqual([{ start: 1, end: 5, rules: ['first'] }]);
  });

  it('returns empty sets for non-directive lines and ordinary comments', () => {
    const text = [
      'const url = "https://example.com";',
      '// just an ordinary comment',
      '<div>no directives here</div>',
    ].join('\n');
    const set = parseDirectives(text);
    expect(set).toEqual({ blocks: [], nextLine: [], sameLine: [] });
  });
});
