import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  docPathFromFile,
  loadDocPages,
  parseDocSource,
} from '../server/utils/llms';

const BASE = 'https://docs.the-doctor.report/';
const contentDir = fileURLToPath(new URL('../content', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('docPathFromFile', () => {
  it('strips order prefixes, the extension, and index', () => {
    expect(docPathFromFile('3.cli/1.reference.md')).toBe('/cli/reference');
    expect(docPathFromFile('index.md')).toBe('/');
    expect(docPathFromFile('2.rules\\vue-doctor\\no-x.md')).toBe(
      '/rules/vue-doctor/no-x',
    );
  });
});

describe('parseDocSource', () => {
  it('reads title/description from frontmatter (quoted or not)', () => {
    const page = parseDocSource({
      file: '4.config/1.reference.md',
      raw: '---\ntitle: "Config"\ndescription: All keys.\n---\n\nBody text\n',
    });
    expect(page).toEqual({
      path: '/config/reference',
      title: 'Config',
      description: 'All keys.',
      body: 'Body text',
      section: 'config',
    });
  });

  it('falls back to the first heading, then the path', () => {
    expect(
      parseDocSource({ file: 'a.md', raw: '# Heading\n\ntext' }).title,
    ).toBe('Heading');
    expect(parseDocSource({ file: 'b.md', raw: 'text' }).title).toBe('/b');
  });
});

describe('buildLlmsTxt / buildLlmsFullTxt', () => {
  const pages = loadDocPages([
    { file: '3.cli/1.reference.md', raw: '---\ntitle: CLI\n---\ncli body' },
    { file: '1.getting-started/1.installation.md', raw: '# Install\nbody' },
    { file: '2.rules/vue-doctor/no-x.md', raw: '---\ntitle: no-x\n---\nrule' },
    { file: 'index.md', raw: '---\ntitle: Home\ndescription: Start\n---\nhi' },
    { file: 'notes.txt', raw: 'ignored' },
  ]);

  it('indexes non-rule pages by section with absolute links', () => {
    const txt = buildLlmsTxt(pages, BASE);
    expect(txt.startsWith('# @geoql/doctor documentation\n\n> ')).toBe(true);
    expect(txt).toContain(
      '## Getting started\n\n- [Install](https://docs.the-doctor.report/getting-started/installation)',
    );
    expect(txt).toContain(
      '## Overview\n\n- [Home](https://docs.the-doctor.report/): Start',
    );
    expect(txt).not.toContain('no-x');
    expect(txt).toContain('all 1 per-rule pages');
    expect(txt).toContain('https://docs.the-doctor.report/llms-full.txt');
  });

  it('inlines every page, rule pages included', () => {
    const full = buildLlmsFullTxt(pages, BASE);
    expect(full).toContain(
      '# no-x\n\nSource: https://docs.the-doctor.report/rules/vue-doctor/no-x\n\nrule',
    );
    expect(full).toContain('> Start');
    expect(full.endsWith('\n')).toBe(true);
  });

  it('builds from the real content tree', () => {
    const sources = walk(contentDir).map((path) => ({
      file: relative(contentDir, path),
      raw: readFileSync(path, 'utf8'),
    }));
    const real = loadDocPages(sources);
    const txt = buildLlmsTxt(real, BASE);
    expect(txt).toContain('/cli/reference');
    expect(txt).toContain('/config/reference');
    expect(buildLlmsFullTxt(real, BASE)).toContain('--warning-exit-code');
  });
});
