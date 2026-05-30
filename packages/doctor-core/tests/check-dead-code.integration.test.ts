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
});
