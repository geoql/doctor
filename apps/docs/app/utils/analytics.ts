import type {
  AnalyticsEvent,
  AnalyticsEventPropertiesMap,
  AnalyticsHandles,
  AnalyticsUserTraits,
  OutboundTarget,
} from '~/types/analytics';

/**
 * Pure fan-out core of `useAnalytics()`. Kept free of Nuxt auto-imports so the
 * unit test can drive it with plain stub handles.
 */
export function createAnalytics(handles: AnalyticsHandles) {
  const { ga, plausible, openpanel } = handles;

  function track<E extends AnalyticsEvent>(
    event: E,
    properties: AnalyticsEventPropertiesMap[E],
  ) {
    const props: Record<string, unknown> = { ...properties };
    ga?.gtag('event', event, props);
    plausible?.plausible(event, { props });
    openpanel?.track(event, props);
  }

  function identify(userId: string, traits: AnalyticsUserTraits = {}) {
    ga?.gtag('set', 'user_properties', { user_id: userId, ...traits });
    openpanel?.identify?.({ profileId: userId, properties: traits });
  }

  return {
    isEnabled: Boolean(ga || plausible || openpanel),
    track,
    identify,
  };
}

const OUTBOUND_HOSTS: ReadonlyArray<
  readonly [test: (url: URL) => boolean, target: OutboundTarget]
> = [
  [
    (u) =>
      u.hostname === 'github.com' &&
      (u.pathname.startsWith('/geoql/doctor-action') ||
        u.pathname.startsWith('/marketplace/actions/')),
    'github_action',
  ],
  [(u) => u.hostname === 'github.com', 'github'],
  [(u) => u.hostname === 'www.npmjs.com' || u.hostname === 'npmjs.com', 'npm'],
  [(u) => u.hostname === 'jsr.io', 'jsr'],
  [(u) => u.hostname === 'app.the-doctor.report', 'app'],
];

/** Map an outbound href to a funnel target, or `null` when it is not one. */
export function classifyOutbound(href: string): OutboundTarget | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  for (const [test, target] of OUTBOUND_HOSTS) {
    if (test(url)) return target;
  }
  return null;
}

const INSTALL_COMMAND =
  /\b(?:npx|pnpm|pnpx|bunx|bun|npm|yarn|deno)\b[^\n]*(?:@geoql\/|\s)(?:vue|nuxt)-doctor\b/u;

/** True when a copied snippet installs or runs one of the doctor CLIs. */
export function isInstallCommand(code: string): boolean {
  return INSTALL_COMMAND.test(code);
}

const CATEGORY_OVERVIEW_PATHS = new Set(['/rules/vue', '/rules/nuxt']);

/**
 * Rule id for a generated rule page, or `null` for every other page. The
 * generated page title is the rule id wrapped in backticks.
 */
export function ruleIdFromPage(
  path: string,
  title: string | undefined,
): string | null {
  if (!path.startsWith('/rules/') || CATEGORY_OVERVIEW_PATHS.has(path)) {
    return null;
  }
  const fromTitle = title?.replaceAll('`', '').trim();
  return fromTitle || path.slice('/rules/'.length);
}
