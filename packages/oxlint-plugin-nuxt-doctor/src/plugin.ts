import type { Plugin } from './rule-types.js';
import { noProcessClientServer } from './rules/ai-slop/no-process-client-server.js';
import { noExplicitImportsOfAutoImported } from './rules/ai-slop/no-explicit-imports-of-auto-imported.js';
import { noUseStateForServerData } from './rules/ai-slop/no-useState-for-server-data.js';
import { noFetchInSetup } from './rules/ai-slop/no-fetch-in-setup.js';
import { useAsyncDataKeyRequiredInLoop } from './rules/data-fetching/useAsyncData-key-required-in-loop.js';
import { defineEventHandlerTyped } from './rules/server-routes/defineEventHandler-typed.js';
import { validateBodyWithH3V2 } from './rules/server-routes/validate-body-with-h3-v2.js';
import { createErrorOnFailure } from './rules/server-routes/createError-on-failure.js';
import { noDocumentInSetup } from './rules/hydration/no-document-in-setup.js';
import { clientOnlyForBrowserApis } from './rules/hydration/clientOnly-for-browser-apis.js';

export const plugin: Plugin = {
  meta: { name: 'nuxt-doctor' },
  rules: {
    'ai-slop/no-process-client-server': noProcessClientServer,
    'ai-slop/no-explicit-imports-of-auto-imported':
      noExplicitImportsOfAutoImported,
    'ai-slop/no-useState-for-server-data': noUseStateForServerData,
    'ai-slop/no-fetch-in-setup': noFetchInSetup,
    'data-fetching/useAsyncData-key-required-in-loop':
      useAsyncDataKeyRequiredInLoop,
    'server-routes/defineEventHandler-typed': defineEventHandlerTyped,
    'server-routes/validate-body-with-h3-v2': validateBodyWithH3V2,
    'server-routes/createError-on-failure': createErrorOnFailure,
    'hydration/no-document-in-setup': noDocumentInSetup,
    'hydration/clientOnly-for-browser-apis': clientOnlyForBrowserApis,
  },
};
