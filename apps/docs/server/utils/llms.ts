// Builders for /llms.txt and /llms-full.txt (https://llmstxt.org). Pure
// functions over the raw Markdown sources so they can be unit-tested
// without a Nuxt runtime; the routes feed them from the `assets:docs`
// server-asset mount (the content/ tree, including the generated rule
// pages), so new pages enroll automatically.

export interface DocSource {
  /** Path relative to content/, e.g. `3.cli/1.reference.md`. */
  readonly file: string;
  readonly raw: string;
}

export interface DocPage {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
  readonly section: string;
}

const SECTION_TITLES: Record<string, string> = {
  'getting-started': 'Getting started',
  rules: 'Rules',
  cli: 'CLI',
  config: 'Configuration',
  scoring: 'Scoring',
};

const stripOrder = (segment: string): string => segment.replace(/^\d+\./, '');

/** Route path Nuxt Content derives from a content file path. */
export function docPathFromFile(file: string): string {
  const segments = file
    .replace(/\\/g, '/')
    .replace(/\.md$/, '')
    .split('/')
    .map(stripOrder);
  if (segments.at(-1) === 'index') segments.pop();
  return `/${segments.join('/')}`;
}

function frontmatterField(frontmatter: string, field: string): string {
  const match = new RegExp(`^${field}:\\s*(.*)$`, 'm').exec(frontmatter);
  return match ? match[1].trim().replace(/^(['"])(.*)\1$/, '$2') : '';
}

export function parseDocSource(source: DocSource): DocPage {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source.raw);
  const frontmatter = match ? match[1] : '';
  const body = (match ? source.raw.slice(match[0].length) : source.raw).trim();
  const path = docPathFromFile(source.file);
  const firstHeading = /^#\s+(.+)$/m.exec(body);
  const section = path.split('/')[1] ?? '';
  return {
    path,
    title:
      frontmatterField(frontmatter, 'title') ||
      (firstHeading ? firstHeading[1].trim() : path),
    description: frontmatterField(frontmatter, 'description'),
    body,
    section,
  };
}

export function loadDocPages(sources: readonly DocSource[]): DocPage[] {
  return [...sources]
    .filter((source) => source.file.endsWith('.md'))
    .sort((a, b) => a.file.localeCompare(b.file, 'en', { numeric: true }))
    .map(parseDocSource);
}

/** A per-rule page lives two levels below /rules (e.g. /rules/vue-doctor/…). */
const isRulePage = (page: DocPage): boolean =>
  page.section === 'rules' && page.path.split('/').length > 3;

const HEADER = `# @geoql/doctor documentation

> Docs for @geoql/vue-doctor and @geoql/nuxt-doctor: deterministic, offline code-health audits for Vue 3 and Nuxt 4 with a 0-100 score, CLI, config, CI integration, and the full rule catalog.`;

export function buildLlmsTxt(
  pages: readonly DocPage[],
  baseUrl: string,
): string {
  const base = baseUrl.replace(/\/$/, '');
  const lines: string[] = [HEADER, ''];
  const sections = new Map<string, DocPage[]>();
  for (const page of pages) {
    if (isRulePage(page)) continue;
    const key = page.section || 'overview';
    sections.set(key, [...(sections.get(key) ?? []), page]);
  }
  for (const [key, list] of sections) {
    lines.push(`## ${SECTION_TITLES[key] ?? 'Overview'}`, '');
    for (const page of list) {
      const description = page.description ? `: ${page.description}` : '';
      lines.push(`- [${page.title}](${base}${page.path})${description}`);
    }
    lines.push('');
  }
  const ruleCount = pages.filter(isRulePage).length;
  lines.push(
    '## Optional',
    '',
    `- [Full documentation for LLMs](${base}/llms-full.txt): every page above plus all ${ruleCount} per-rule pages in one plaintext file`,
    `- [Config JSON schema](${base}/schema.json): JSON Schema for doctor.config.*`,
    `- [Agent playbook](${base}/prompts/doctor-agent.md): the local-triage workflow AI agents follow`,
    '',
  );
  return lines.join('\n');
}

export function buildLlmsFullTxt(
  pages: readonly DocPage[],
  baseUrl: string,
): string {
  const base = baseUrl.replace(/\/$/, '');
  const parts = [HEADER];
  for (const page of pages) {
    parts.push(
      [
        '---',
        '',
        `# ${page.title}`,
        '',
        `Source: ${base}${page.path}`,
        ...(page.description ? ['', `> ${page.description}`] : []),
        '',
        page.body,
      ].join('\n'),
    );
  }
  return `${parts.join('\n\n')}\n`;
}
