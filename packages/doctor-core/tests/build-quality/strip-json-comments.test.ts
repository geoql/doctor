import { describe, expect, it } from 'vitest';
import { stripJsonComments } from '../../src/build-quality/strip-json-comments.js';

describe('stripJsonComments', () => {
  it('removes a line comment', () => {
    const input = '{\n  "a": 1 // trailing\n}';
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 1 });
  });

  it('removes a block comment', () => {
    const input = '{\n  /* block */ "a": 1\n}';
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 1 });
  });

  it('removes a multi-line block comment', () => {
    const input = '{\n  /*\n   * doc\n   */\n  "a": 1\n}';
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 1 });
  });

  it('preserves comment-like sequences inside strings', () => {
    const input = '{ "url": "http://x.test", "note": "/* keep */ // keep" }';
    expect(JSON.parse(stripJsonComments(input))).toEqual({
      url: 'http://x.test',
      note: '/* keep */ // keep',
    });
  });

  it('preserves escaped quotes inside strings', () => {
    const input = '{ "q": "she said \\"hi\\" // ok" }';
    expect(JSON.parse(stripJsonComments(input))).toEqual({
      q: 'she said "hi" // ok',
    });
  });

  it('leaves comment-free input untouched', () => {
    const input = '{"a":1,"b":"two"}';
    expect(stripJsonComments(input)).toBe(input);
  });
});
