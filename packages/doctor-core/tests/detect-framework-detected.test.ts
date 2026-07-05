import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../src/detect-project.js';
import { agentReport } from '../src/reporters/agent.js';
import {
  buildDoctorReport,
  DOCTOR_REPORT_SCHEMA_VERSION,
  jsonReport,
} from '../src/reporters/json.js';
import { prettyReport } from '../src/reporters/pretty.js';
import type { ReporterInput } from '../src/reporters/types.js';
import { scoreDiagnostics } from '../src/score.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-fwd-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

function reporterInput(frameworkDetected: boolean): ReporterInput {
  return {
    toolName: '@geoql/vue-doctor',
    toolVersion: '0.1.0',
    rootDirectory: '/proj',
    analyzedFileCount: 1,
    elapsedMs: 10,
    diagnostics: [],
    score: scoreDiagnostics([]),
    projectInfo: {
      framework: frameworkDetected ? 'vue' : 'unknown',
      frameworkDetected,
      vueVersion: frameworkDetected ? '3.5.0' : null,
      nuxtVersion: null,
      capabilities: [],
      rootDirectory: '/proj',
    },
  };
}

describe('detectProject frameworkDetected', () => {
  it('sets frameworkDetected=true when package.json declares nuxt', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^4.0.0' } }),
    });
    const project = await detectProject(dir);
    expect(project.framework).toBe('nuxt');
    expect(project.frameworkDetected).toBe(true);
  });

  it('sets frameworkDetected=true when package.json declares vue (no nuxt)', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ dependencies: { vue: '^3.5.0' } }),
    });
    const project = await detectProject(dir);
    expect(project.framework).toBe('vue');
    expect(project.frameworkDetected).toBe(true);
  });

  it('sets frameworkDetected=false when neither vue nor nuxt is declared', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'plain' }),
    });
    const project = await detectProject(dir);
    expect(project.framework).toBe('unknown');
    expect(project.frameworkDetected).toBe(false);
  });

  it('sets frameworkDetected=false when there is no package.json at all', async () => {
    const dir = await fixture({});
    const project = await detectProject(dir);
    expect(project.frameworkDetected).toBe(false);
  });
});

describe('JSON reporter frameworkDetected', () => {
  it('exposes frameworkDetected=true on the JSON reporter projectInfo', () => {
    const parsed = JSON.parse(jsonReport(reporterInput(true))) as {
      projectInfo: { frameworkDetected: boolean };
    };
    expect(parsed.projectInfo.frameworkDetected).toBe(true);
  });

  it('exposes frameworkDetected=false for an unknown project', () => {
    const report = buildDoctorReport(reporterInput(false));
    expect(report.projectInfo.frameworkDetected).toBe(false);
  });

  it('schemaVersion stays "1" after adding frameworkDetected', () => {
    expect(DOCTOR_REPORT_SCHEMA_VERSION).toBe('1');
    const parsed = JSON.parse(jsonReport(reporterInput(true))) as {
      schemaVersion: string;
    };
    expect(parsed.schemaVersion).toBe('1');
  });

  it('does not surface frameworkDetected in the human (agent/pretty) reporters', () => {
    const input = reporterInput(true);
    expect(agentReport(input)).not.toContain('frameworkDetected');
    expect(prettyReport(input, { color: false })).not.toContain(
      'frameworkDetected',
    );
  });
});
