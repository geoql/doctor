// Test/story surface classification.
//
// Findings from test, story, and fixture files are still reported, but they
// do not drag down a project's production health score or trip the CI gate
// unless `includeTestFiles` is set. Mirrors react-doctor #1326/#1377.

const BASENAME_MARKERS = [
  '.test.',
  '.spec.',
  '.stories.',
  '.story.',
  '.cy.',
  '.setup.',
];

const TEST_DIR_SEGMENTS = new Set([
  '__tests__',
  '__mocks__',
  '__fixtures__',
  '__snapshots__',
  'tests',
  'test',
  'e2e',
  'cypress',
  'playwright',
]);

// A file under one of these becomes a real URL, so `pages/tests/index.vue`
// is production code that merely happens to be named "tests" (#1377).
const ROUTE_DIR_SEGMENTS = new Set(['pages', 'routes', 'api', 'layouts']);

/**
 * True when `path` looks like a test, story, or fixture file rather than
 * shipped production source.
 *
 * `path` must be RELATIVE to the audited project root. Absolute paths would
 * classify by segments of the machine's directory layout (e.g. a project
 * checked out under ~/dev/tests/) instead of the project's own structure.
 */
export function isTestSurfacePath(path: string): boolean {
  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
  const basename = segments.at(-1) ?? '';

  if (BASENAME_MARKERS.some((marker) => basename.includes(marker))) return true;

  let sawRouteDir = false;
  for (const segment of segments.slice(0, -1)) {
    if (ROUTE_DIR_SEGMENTS.has(segment)) sawRouteDir = true;
    else if (TEST_DIR_SEGMENTS.has(segment) && !sawRouteDir) return true;
  }
  return false;
}
