import { isAutomationBrowser } from '~/utils/automation-browser';

export default defineNuxtPlugin(() => {
  const gtagId = useRuntimeConfig().public.gtagId;

  // Automation browsers get no analytics — see utils/automation-browser.ts.
  if (!gtagId || isAutomationBrowser()) return;

  const { proxy } = useScriptGoogleAnalytics({ id: gtagId });

  const gtag = (...args: unknown[]) => {
    (proxy.gtag as (...a: unknown[]) => void)(...args);
  };

  return {
    provide: {
      ga: { gtag },
    },
  };
});
