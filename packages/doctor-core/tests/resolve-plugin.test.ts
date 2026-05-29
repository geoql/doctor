import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  resolveOxlintBin,
  resolveVueDoctorPluginPath,
} from '../src/oxlint/resolve-plugin.js';

describe('resolver fallback to bundled install', () => {
  it('resolves oxlint bin from a target dir without node_modules', () => {
    const bin = resolveOxlintBin(tmpdir());
    expect(existsSync(bin)).toBe(true);
  });

  it('resolves the vue-doctor plugin from a target dir without node_modules', () => {
    const pluginPath = resolveVueDoctorPluginPath(tmpdir());
    expect(existsSync(pluginPath)).toBe(true);
  });
});
