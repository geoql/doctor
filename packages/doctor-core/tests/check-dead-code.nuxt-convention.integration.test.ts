import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { detectProject } from '../src/detect-project.js';
import { loadDoctorConfig } from '../src/config/load.js';
import { checkDeadCode } from '../src/check-dead-code.js';

const FIXTURE = resolve(
  import.meta.dirname,
  'fixtures',
  'dead-code',
  'nuxt-convention-files',
);

async function deadCode() {
  const projectInfo = await detectProject(FIXTURE);
  const doctorConfig = await loadDoctorConfig(FIXTURE);
  return checkDeadCode({
    projectInfo,
    doctorConfig,
    enabled: true,
    timeoutMs: 60_000,
  });
}

describe('checkDeadCode — Nuxt convention and hook-run files', () => {
  it('does not flag content.config.ts or scripts run by git hooks / package scripts, but still flags a real orphan (#322)', async () => {
    const diagnostics = await deadCode();
    const unusedFiles = diagnostics
      .filter((d) => d.ruleId === 'dead-code/unused-file')
      .map((d) => d.file);
    expect(unusedFiles.some((f) => f.endsWith('content.config.ts'))).toBe(
      false,
    );
    expect(unusedFiles.some((f) => f.endsWith('scripts/check-push.ts'))).toBe(
      false,
    );
    expect(
      unusedFiles.some((f) => f.endsWith('scripts/release-check.ts')),
    ).toBe(false);
    expect(unusedFiles.some((f) => f.endsWith('scripts/orphan.ts'))).toBe(true);
  }, 60_000);

  it('does not report vue-tsc as an unused devDependency, since vue-tsc-in-devDeps requires it (#323)', async () => {
    const diagnostics = await deadCode();
    const unusedDeps = diagnostics
      .filter((d) => d.ruleId === 'dead-code/unused-dependency')
      .map((d) => d.message);
    expect(unusedDeps.some((m) => m.includes('vue-tsc'))).toBe(false);
  }, 60_000);
});
