/**
 * Closed set of product events the docs site sends. Every event fans out to
 * Plausible, OpenPanel and GA4 through `useAnalytics().track()` — never pass a
 * free string.
 */
export type AnalyticsEvent =
  | 'install_command_copied'
  | 'code_copied'
  | 'rule_page_viewed'
  | 'outbound_click'
  | 'search_result_selected';

/** Outbound destinations that matter for the docs → install funnel. */
export type OutboundTarget = 'github' | 'npm' | 'jsr' | 'github_action' | 'app';

export interface CodeCopiedProperties {
  page: string;
  language: string;
}

export interface RulePageViewedProperties {
  rule_id: string;
  plugin: string;
}

export interface OutboundClickProperties {
  target: OutboundTarget;
  location: string;
  href: string;
}

export interface SearchResultSelectedProperties {
  query_length: number;
  result_count: number;
  position: number;
}

/** Event name → its property shape. Keeps `track()` calls type-checked. */
export interface AnalyticsEventPropertiesMap {
  install_command_copied: CodeCopiedProperties;
  code_copied: CodeCopiedProperties;
  rule_page_viewed: RulePageViewedProperties;
  outbound_click: OutboundClickProperties;
  search_result_selected: SearchResultSelectedProperties;
}

// Shape of the Plausible `pa-*.js` global: callable, plus the loader's
// bookkeeping — q (pre-load queue), o (init options the loader boots from), init.
export interface PlausibleFn {
  (...args: unknown[]): void;
  q?: unknown[];
  o?: Record<string, unknown>;
  init?: (options?: Record<string, unknown>) => void;
}

/** Minimal shape of the GA4 gtag handle provided as `$ga`. */
export interface GtagHandle {
  gtag: (...args: unknown[]) => void;
}

/** Minimal shape of the Plausible handle provided as `$plausible`. */
export interface PlausibleHandle {
  plausible: (...args: unknown[]) => void;
}

/** Minimal shape of the OpenPanel client provided as `$openpanel`. */
export interface OpenPanelHandle {
  track: (name: string, properties?: Record<string, unknown>) => unknown;
  identify?: (payload: {
    profileId: string;
    properties?: Record<string, unknown>;
  }) => unknown;
}

export interface AnalyticsHandles {
  ga?: GtagHandle;
  plausible?: PlausibleHandle;
  openpanel?: OpenPanelHandle;
}

export interface AnalyticsUserTraits {
  [key: string]: string | number | boolean | undefined;
}
