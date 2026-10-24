/**
 * Automation-browser detection for third-party beacon gating.
 *
 * Playwright, Puppeteer and Selenium all set `navigator.webdriver`. Bot traffic
 * pollutes the dataset, and every beacon adds unbounded latency to the
 * networkidle window headless agent checkers wait on. Real users are never
 * gated.
 *
 * Callers that feed `useHead()` must gate the `useHead` call itself: this
 * helper is always `false` during SSR, so a value-level guard would still ship
 * the tag in the server-rendered HTML.
 */
export function isAutomationBrowser(
  nav: Pick<Navigator, 'webdriver'> | undefined = globalThis.navigator,
): boolean {
  return nav?.webdriver === true;
}
