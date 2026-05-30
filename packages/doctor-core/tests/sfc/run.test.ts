import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcDescriptorCache } from '../../src/sfc/parse-sfc-descriptor.js';
import { runSfcPass } from '../../src/sfc/run.js';

const RULE_ID = 'vue-doctor/sfc/no-mixed-options-and-composition-api';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-sfc-run-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const MIXED =
  '<script setup>const x = 1;</script>\n' +
  '<script>export default { data() {} };</script>';

beforeEach(() => {
  clearSfcDescriptorCache();
});

describe('runSfcPass', () => {
  it('flags mixed Options API in a both-blocks SFC', async () => {
    const path = await writeVue(MIXED);
    const diags = await runSfcPass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE_ID)).toBe(true);
  });

  it('skips non-.vue files', async () => {
    const diags = await runSfcPass({ files: ['/some/file.ts'] });
    expect(diags).toEqual([]);
  });

  it('skips .vue files that fail to parse', async () => {
    const path = await writeVue('<template><div></span></template>');
    const diags = await runSfcPass({ files: [path] });
    expect(diags).toEqual([]);
  });

  it('skips a rule overridden to off', async () => {
    const path = await writeVue(MIXED);
    const diags = await runSfcPass({
      files: [path],
      ruleOverrides: { [RULE_ID]: 'off' },
    });
    expect(diags.some((d) => d.ruleId === RULE_ID)).toBe(false);
  });

  it('rewrites severity when overridden', async () => {
    const path = await writeVue(MIXED);
    const diags = await runSfcPass({
      files: [path],
      ruleOverrides: { [RULE_ID]: 'warn' },
    });
    const diag = diags.find((d) => d.ruleId === RULE_ID);
    expect(diag?.severity).toBe('warn');
  });
});
