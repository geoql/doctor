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

  // The previous #85 fix made convention-dir FILES reachable by registering
  // them as knip entry points, but EXPORTS of those files (e.g. the `useAuto`
  // function from `composables/useAuto.ts`) are still flagged when nothing
  // explicitly imports them — they get auto-imported by name at build time,
  // so no source-level import exists. This test guards the export-level
  // edge case of the same regression.
  it('does not flag auto-imported exports from convention dirs (#85 edge case)', async () => {
    const projectInfo = await detectProject(AUTO_IMPORT_FIXTURE);
    const doctorConfig = await loadDoctorConfig(AUTO_IMPORT_FIXTURE);

    const diagnostics = await checkDeadCode({
      projectInfo,
      doctorConfig,
      enabled: true,
      timeoutMs: 60_000,
    });

    const unusedExports = diagnostics.filter(
      (d) => d.ruleId === 'dead-code/unused-export',
    );
    const flaggedExports = unusedExports.map((d) => d.file);

    // Auto-import makes the export reachable even though no source file
    // imports it, so knip must not flag it.
    expect(flaggedExports.some((f) => f.includes('composables/useAuto'))).toBe(
      false,
    );
  }, 60_000);

  // Same scenario as above but for type exports (knip reports them under
  // a different rule id). Auto-import plugins can register type exports
  // alongside value exports, so a type like `AutoOptions` exported from
  // `composables/useAuto.ts` is reachable at build time even without a
  // source-level import. This guards the `unused-type-export` half of
  // the same regression — if knip changes how it treats type exports
  // in entry-point files, this test catches the regression.
  it('does not flag auto-imported type exports from convention dirs (#85 edge case)', async () => {
    const projectInfo = await detectProject(AUTO_IMPORT_FIXTURE);
    const doctorConfig = await loadDoctorConfig(AUTO_IMPORT_FIXTURE);

    const diagnostics = await checkDeadCode({
      projectInfo,
      doctorConfig,
      enabled: true,
      timeoutMs: 60_000,
    });

    const unusedTypeExports = diagnostics.filter(
      (d) => d.ruleId === 'dead-code/unused-type-export',
    );
    const flaggedTypeExports = unusedTypeExports.map((d) => d.file);

    expect(
      flaggedTypeExports.some((f) => f.includes('composables/useAuto')),
    ).toBe(false);
  }, 60_000);
});
