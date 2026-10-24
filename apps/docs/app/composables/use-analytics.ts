import type {
  GtagHandle,
  OpenPanelHandle,
  PlausibleHandle,
} from '~/types/analytics';
import { createAnalytics } from '~/utils/analytics';

/**
 * One `track(event, props)` that fans out to GA4 (`$ga`), Plausible
 * (`$plausible`) and OpenPanel (`$openpanel`). Each handle is absent on the
 * server and in automation browsers, so calls are safe everywhere.
 */
export function useAnalytics() {
  const nuxtApp = useNuxtApp();
  return createAnalytics({
    ga: nuxtApp.$ga as GtagHandle | undefined,
    plausible: nuxtApp.$plausible as PlausibleHandle | undefined,
    openpanel: nuxtApp.$openpanel as OpenPanelHandle | undefined,
  });
}
