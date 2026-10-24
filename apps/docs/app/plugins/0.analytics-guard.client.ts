import { isAutomationBrowser } from '~/utils/automation-browser';

/**
 * Runs before the `@openpanel/nuxt` client plugin, which builds its client from
 * `runtimeConfig.public.openpanel`.
 *
 * - `openpanelClientId` is the single source of truth for the client id
 *   (overridable with `NUXT_PUBLIC_OPENPANEL_CLIENT_ID`).
 * - Automation browsers get `disabled: true`: the SDK then queues events
 *   in memory and never sends them, matching the GA4 / Plausible guards.
 */
export default defineNuxtPlugin({
  name: 'analytics-guard',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig().public;
    const openpanel = config.openpanel as Record<string, unknown>;
    openpanel.clientId = config.openpanelClientId;
    if (isAutomationBrowser()) openpanel.disabled = true;
  },
});
