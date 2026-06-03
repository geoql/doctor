import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../src/detect-project.js';
import { loadDoctorConfig } from '../src/config/load.js';
import { checkDeadCode } from '../src/check-dead-code.js';

const FIXTURE = resolve(
  import.meta.dirname,
  'fixtures',
  'dead-code',
  'vue3-dead-export',
);

const AUTO_IMPORT_FIXTURE = resolve(
  import.meta.dirname,
  'fixtures',
  'dead-code',
  'vue3-auto-import',
);

describe('checkDeadCode integration', () => {
  it('detects unused export in vue3 fixture', async () => {
    const projectInfo = await detectProject(FIXTURE);
    const doctorConfig = await loadDoctorConfig(FIXTURE);

    const diagnostics = await checkDeadCode({
      projectInfo,
      doctorConfig,
      enabled: true,
      timeoutMs: 60_000,
    });

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);

    const unusedExport = diagnostics.find(
      (d) => d.ruleId === 'dead-code/unused-export',
    );
    const unusedFile = diagnostics.find(
      (d) => d.ruleId === 'dead-code/unused-file',
    );

    expect(unusedExport || unusedFile).toBeDefined();

    if (unusedExport) {
      expect(unusedExport.file).toContain('oldHelper');
      expect(unusedExport.source).toBe('dead-code');
    }

    if (unusedFile) {
      expect(unusedFile.file).toContain('oldHelper');
      expect(unusedFile.source).toBe('dead-code');
    }
  }, 60_000);

  it('does not flag auto-imported/file-routed convention dirs, but still flags real orphans (#85)', async () => {
    const projectInfo = await detectProject(AUTO_IMPORT_FIXTURE);
    const doctorConfig = await loadDoctorConfig(AUTO_IMPORT_FIXTURE);

    const diagnostics = await checkDeadCode({
      projectInfo,
      doctorConfig,
      enabled: true,
      timeoutMs: 60_000,
    });

    const unusedFiles = diagnostics.filter(
      (d) => d.ruleId === 'dead-code/unused-file',
    );
    const flagged = unusedFiles.map((d) => d.file);

    expect(flagged.some((f) => f.includes('components/AutoCard'))).toBe(false);
    expect(flagged.some((f) => f.includes('composables/useAuto'))).toBe(false);
    expect(flagged.some((f) => f.includes('pages/HomePage'))).toBe(false);
    expect(flagged.some((f) => f.includes('layouts/DefaultLayout'))).toBe(
      false,
    );

    expect(flagged.some((f) => f.includes('utils/trulyOrphaned'))).toBe(true);
  }, 60_000);
});
