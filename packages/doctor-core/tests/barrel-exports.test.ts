import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';
import * as configBarrel from '../src/config/index.js';
import * as disablesBarrel from '../src/disables/index.js';
import * as projectInfoBarrel from '../src/project-info/index.js';
import '../src/types.js';
import '../src/build-quality/types.js';
import '../src/config/types.js';
import '../src/dead-code/types.js';
import '../src/deps/types.js';
import '../src/nuxt/post-checks/types.js';
import '../src/oxlint/types.js';
import '../src/reporters/types.js';
import '../src/sfc/rules/types.js';
import '../src/template/rules/types.js';
import '../src/types/project-info.js';

describe('package barrels', () => {
  it('re-exports the public audit surface', () => {
    expect(typeof core.audit).toBe('function');
    expect(typeof configBarrel.BUILT_IN_RECOMMENDED).toBe('object');
    expect(typeof disablesBarrel.applyInlineDisables).toBe('function');
    expect(typeof projectInfoBarrel.detectProject).toBe('function');
  });
});
