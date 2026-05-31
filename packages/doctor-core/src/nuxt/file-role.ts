const PAGE_DIR = /^(?:app\/)?pages\//;
const LAYOUT_DIR = /^(?:app\/)?layouts\//;

function normalize(relPath: string): string {
  return relPath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * True when the path points at a Nuxt page component — a `.vue` file under
 * `pages/` (Nuxt 3 layout) or `app/pages/` (Nuxt 4 layout) at the project root.
 */
export function isNuxtPageFile(relPath: string): boolean {
  const path = normalize(relPath);
  return PAGE_DIR.test(path) && path.endsWith('.vue');
}

/**
 * True when the path points at a Nitro server file — a `.ts` file under the
 * project-root `server/` directory.
 */
export function isNuxtServerFile(relPath: string): boolean {
  const path = normalize(relPath);
  return path.startsWith('server/') && path.endsWith('.ts');
}

/**
 * True when the path points at a Nuxt layout component — a `.vue` file under
 * `layouts/` (Nuxt 3 layout) or `app/layouts/` (Nuxt 4 layout) at the project
 * root.
 */
export function isNuxtLayoutFile(relPath: string): boolean {
  const path = normalize(relPath);
  return LAYOUT_DIR.test(path) && path.endsWith('.vue');
}
