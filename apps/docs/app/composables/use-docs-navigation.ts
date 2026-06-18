import type { NavSection } from '~/types';

/**
 * Documentation sidebar navigation.
 *
 * The `path` values MUST match the actual content collection slugs
 * (i.e. the on-disk path under `content/`, sans the leading number
 * prefix that controls ordering). Mismatches here vs content/*.md
 * files cause the catch-all page to throw 404 — geolith hit this
 * bug before. Keep these in lockstep with `content/`.
 */
export function useDocsNavigation() {
  const sections: NavSection[] = [
    {
      title: 'Getting started',
      path: '/getting-started',
      children: [
        { title: 'Installation', path: '/getting-started/installation' },
        { title: 'Quickstart', path: '/getting-started/quickstart' },
        { title: 'Run in CI', path: '/getting-started/ci' },
      ],
    },
    {
      title: 'Rules',
      path: '/rules',
      children: [
        { title: 'Vue', path: '/rules/vue' },
        { title: 'Nuxt', path: '/rules/nuxt' },
      ],
    },
    {
      title: 'CLI reference',
      path: '/cli',
      children: [{ title: 'Commands & flags', path: '/cli/reference' }],
    },
    {
      title: 'Config',
      path: '/config',
      children: [{ title: 'doctor.config.ts', path: '/config/reference' }],
    },
    {
      title: 'Scoring',
      path: '/scoring',
      children: [
        { title: 'How the score is computed', path: '/scoring/how-it-works' },
      ],
    },
  ];

  return { sections };
}
