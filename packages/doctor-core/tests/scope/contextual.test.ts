import { describe, expect, it } from 'vite-plus/test';
import {
  createContextualMatcher,
  deletionPoints,
} from '../../src/scope/contextual.js';
import {
  getRuleDiffScope,
  RULE_DIFF_SCOPES,
} from '../../src/scope/diff-scope.js';
import type { FileChange, Hunk } from '../../src/scope/git-changes.js';
import { resolveOwnerRanges } from '../../src/scope/owner.js';
import { RULE_REGISTRY } from '../../src/rule-registry.js';
import type { Diagnostic } from '../../src/types.js';

function diag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: '/r/C.vue',
    line: 1,
    column: 1,
    ruleId: 'vue-doctor/template/v-for-has-key',
    severity: 'error',
    message: 'm',
    source: 'template',
    ...overrides,
  };
}

const SFC = [
  '<script setup lang="ts">', // 1
  'function outer() {', // 2
  '  const a = 1;', // 3
  '  const inner = () => {', // 4
  '    return a;', // 5
  '  };', // 6
  '  return inner;', // 7
  '}', // 8
  'const top = 1;', // 9
  '</script>', // 10
  '<template>', // 11
  '  <div class="x">', // 12
  '    <img src="a.png">', // 13
  '    <span>', // 14
  '      text', // 15
  '    </span>', // 16
  '  </div>', // 17
  '  plain', // 18
  '</template>', // 19
  '',
].join('\n');

const TS = [
  'export function useThing() {', // 1
  '  const run = function () {', // 2
  '    return 1;', // 3
  '  };', // 4
  '  return run;', // 5
  '}', // 6
  'export default defineComponent({', // 7
  '  name: "x",', // 8
  '});', // 9
  '',
].join('\n');

describe('resolveOwnerRanges', () => {
  it('file scope owns the whole file', () => {
    expect(resolveOwnerRanges('/r/a.ts', TS, diag(), 'file')).toEqual([[1, 9]]);
  });

  it('template-element owns the innermost element minus child elements', () => {
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 13, column: 5 }),
        'template-element',
      ),
    ).toEqual([[13, 13]]);
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 12, column: 3 }),
        'template-element',
      ),
    ).toEqual([
      [12, 12],
      [17, 17],
    ]);
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 18, column: 3 }),
        'template-element',
      ),
    ).toBeNull();
    expect(
      resolveOwnerRanges('/r/a.ts', TS, diag(), 'template-element'),
    ).toBeNull();
    expect(
      resolveOwnerRanges(
        '/r/N.vue',
        '<script>x</script>\n',
        diag(),
        'template-element',
      ),
    ).toBeNull();
  });

  it('keeps the diagnostic line even when a child spans it', () => {
    const src = '<template>\n  <a><b>\n  </b></a>\n</template>\n';
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        src,
        diag({ line: 2, column: 3 }),
        'template-element',
      ),
    ).toEqual([[2, 2]]);
  });

  it('function owns the enclosing function minus nested functions', () => {
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 3, column: 3 }),
        'function',
      ),
    ).toEqual([
      [2, 3],
      [7, 8],
    ]);
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 5, column: 5 }),
        'function',
      ),
    ).toEqual([[4, 6]]);
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 9, column: 1 }),
        'function',
      ),
    ).toBeNull();
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        SFC,
        diag({ line: 13, column: 1 }),
        'function',
      ),
    ).toBeNull();
    expect(
      resolveOwnerRanges(
        '/r/a.ts',
        TS,
        diag({ line: 3, column: 5 }),
        'function',
      ),
    ).toEqual([[2, 4]]);
    expect(
      resolveOwnerRanges('/r/bad.ts', 'function (', diag(), 'function'),
    ).toBeNull();
  });

  it('maps the first script line using the tag column', () => {
    const src = '<script>function f() { return 1 }</script>\n';
    expect(
      resolveOwnerRanges(
        '/r/C.vue',
        src,
        diag({ line: 1, column: 20 }),
        'function',
      ),
    ).toEqual([[1, 1]]);
  });

  it('component owns the SFC, or the defineComponent / default export', () => {
    expect(resolveOwnerRanges('/r/C.vue', SFC, diag(), 'component')).toEqual([
      [1, 19],
    ]);
    expect(
      resolveOwnerRanges(
        '/r/a.ts',
        TS,
        diag({ line: 8, column: 3 }),
        'component',
      ),
    ).toEqual([[7, 9]]);
    expect(
      resolveOwnerRanges(
        '/r/a.ts',
        TS,
        diag({ line: 3, column: 3 }),
        'component',
      ),
    ).toBeNull();
    expect(
      resolveOwnerRanges(
        '/r/b.ts',
        'x.y();\nother({\n  a: 1,\n});\n',
        diag({ line: 3, column: 3 }),
        'component',
      ),
    ).toBeNull();
  });
});

describe('createContextualMatcher', () => {
  const hunk = (newStart: number, newCount: number): Hunk => ({
    oldStart: newStart,
    oldCount: 1,
    newStart,
    newCount,
  });
  const change = (path: string, hunks: Hunk[]): FileChange => ({
    path,
    oldPath: path,
    status: 'modified',
    hunks,
  });
  const files: Record<string, string> = { '/r/C.vue': SFC, '/r/a.ts': TS };
  const read = (file: string): string => {
    const content = files[file];
    if (content === undefined) throw new Error('ENOENT');
    return content;
  };

  it('reports owners that contain an edit, not siblings', () => {
    // Edit inside <span> (line 15): the <div> owns lines 12-13,17 only.
    const keep = createContextualMatcher(
      '/r',
      [change('C.vue', [hunk(15, 1)])],
      read,
    );
    const onDiv = diag({ line: 12, column: 3 });
    expect(keep(onDiv)).toBe(false);
    const onSpan = diag({ line: 14, column: 5 });
    expect(keep(onSpan)).toBe(true);
    expect(keep(diag({ file: '/r/Other.vue', line: 15 }))).toBe(false);
    expect(keep(diag({ line: 15 }))).toBe(true);
  });

  it('keeps line matching for rules without an owner', () => {
    const keep = createContextualMatcher(
      '/r',
      [change('C.vue', [hunk(15, 1)])],
      read,
    );
    expect(keep(diag({ line: 14, column: 5, ruleId: 'some/line-rule' }))).toBe(
      false,
    );
  });

  it('treats a deletion inside a function as an edit to it', () => {
    expect(deletionPoints(change('a.ts', [hunk(2, 0), hunk(5, 1)]))).toEqual([
      2,
    ]);
    const keep = createContextualMatcher(
      '/r',
      [change('a.ts', [hunk(2, 0)])],
      read,
    );
    const inner = diag({
      file: '/r/a.ts',
      line: 3,
      column: 5,
      ruleId: 'vue-doctor/reactivity/watch-without-cleanup',
    });
    expect(keep(inner)).toBe(true);
    const outer = createContextualMatcher(
      '/r',
      [change('a.ts', [hunk(6, 0)])],
      read,
    );
    expect(outer(inner)).toBe(false);
  });

  it('honors explicit contextRanges over the rule scope', () => {
    const keep = createContextualMatcher(
      '/r',
      [change('C.vue', [hunk(9, 1)])],
      read,
    );
    expect(
      keep(
        diag({
          line: 13,
          ruleId: 'some/line-rule',
          contextRanges: [{ line: 8, endLine: 9 }],
        }),
      ),
    ).toBe(true);
    expect(
      keep(diag({ line: 13, contextRanges: [{ line: 2, endLine: 1 }] })),
    ).toBe(false);
  });

  it('falls back to line matching when the owner source is unreadable', () => {
    const keep = createContextualMatcher(
      '/r',
      [change('Gone.vue', [hunk(9, 1)])],
      read,
    );
    const d = diag({ file: '/r/Gone.vue', line: 3 });
    expect(keep(d)).toBe(false);
    expect(keep(d)).toBe(false);
  });

  it('reads real files by default', () => {
    const keep = createContextualMatcher('/nonexistent', [
      change('x.vue', [hunk(9, 1)]),
    ]);
    expect(keep(diag({ file: '/nonexistent/x.vue', line: 3 }))).toBe(false);
  });
});

describe('RULE_DIFF_SCOPES', () => {
  it('only declares registered rules and defaults to line', () => {
    const known = new Set(RULE_REGISTRY.map((r) => r.id));
    for (const id of RULE_DIFF_SCOPES.keys())
      expect(known.has(id), id).toBe(true);
    expect(getRuleDiffScope('vue-doctor/template/v-for-has-key')).toBe(
      'template-element',
    );
    expect(getRuleDiffScope('unknown/rule')).toBe('line');
  });
});
