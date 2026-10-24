import type { PlausibleFn } from '~/types/analytics';
import { isAutomationBrowser } from '~/utils/automation-browser';

export default defineNuxtPlugin(() => {
  const { plausibleScriptId, plausibleApiHost } = useRuntimeConfig().public;

  if (!plausibleScriptId || !plausibleApiHost) return;

  // Automation browsers get no analytics — see utils/automation-browser.ts.
  // The guard sits on the useHead call itself so no script tag is emitted.
  if (isAutomationBrowser()) return;

  // The Oct-2025 pa-*.js tracker only boots if `window.plausible.o` is already
  // set when it loads (its tail runs `plausible.o && S(plausible.o)`). So use
  // Plausible's official snippet: define the queue stub and call init() to set
  // `.o` BEFORE the async script arrives. @nuxtjs/plausible and the
  // @nuxt/scripts Plausible helper never do this, so they never boot pa-*.js.
  const w = window as unknown as { plausible?: PlausibleFn };
  const stub: PlausibleFn =
    w.plausible ??
    ((...args: unknown[]) => {
      (stub.q ||= []).push(args);
    });
  stub.init ||= (options?: Record<string, unknown>) => {
    stub.o = options || {};
  };
  w.plausible = stub;
  stub.init({
    autoCapturePageviews: true,
    captureOnLocalhost: import.meta.dev,
  });

  useHead({
    script: [
      {
        src: `${plausibleApiHost}/js/${plausibleScriptId}.js`,
        async: true,
      },
    ],
  });

  const plausible = (...args: unknown[]) => {
    w.plausible?.(...args);
  };

  return {
    provide: {
      plausible: { plausible },
    },
  };
});
