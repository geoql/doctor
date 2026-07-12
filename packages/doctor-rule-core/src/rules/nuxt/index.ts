import { defineRule } from '../../define-rule.js';
import type { CoreRule } from '../../types.js';
import { noExplicitImportsOfAutoImported } from './ai-slop/no-explicit-imports-of-auto-imported.js';
import { noFetchInSetup } from './ai-slop/no-fetch-in-setup.js';
import { noProcessClientServer } from './ai-slop/no-process-client-server.js';
import { noUseStateForServerData } from './ai-slop/no-useState-for-server-data.js';
import { useAsyncDataKeyRequiredInLoop } from './data-fetching/useAsyncData-key-required-in-loop.js';
import { noUserInputInFetchUrl } from './security/no-user-input-in-fetch-url.js';
import { clientOnlyForBrowserApis } from './hydration/clientOnly-for-browser-apis.js';
import { noBrowserGlobalInComputed } from './hydration/no-browser-global-in-computed.js';
import { noDocumentInSetup } from './hydration/no-document-in-setup.js';
import { createErrorOnFailure } from './server-routes/createError-on-failure.js';
import { defineEventHandlerTyped } from './server-routes/defineEventHandler-typed.js';
import { validateBodyWithH3V2 } from './server-routes/validate-body-with-h3-v2.js';

function coreRule(
  id: string,
  category: CoreRule['category'],
  severity: CoreRule['severity'],
  recommended: boolean,
  rule: Omit<CoreRule, 'id' | 'category' | 'severity' | 'recommended'>,
): CoreRule {
  return { id, category, severity, recommended, ...rule };
}

export const NUXT_RULES: readonly CoreRule[] = [
  coreRule(
    'ai-slop/no-process-client-server',
    'ai-slop',
    'error',
    true,
    defineRule(noProcessClientServer),
  ),
  coreRule(
    'ai-slop/no-explicit-imports-of-auto-imported',
    'ai-slop',
    'warn',
    true,
    defineRule(noExplicitImportsOfAutoImported),
  ),
  coreRule(
    'ai-slop/no-useState-for-server-data',
    'ai-slop',
    'warn',
    true,
    defineRule(noUseStateForServerData),
  ),
  coreRule(
    'ai-slop/no-fetch-in-setup',
    'ai-slop',
    'warn',
    true,
    defineRule(noFetchInSetup),
  ),
  coreRule(
    'data-fetching/useAsyncData-key-required-in-loop',
    'data-fetching',
    'error',
    true,
    defineRule(useAsyncDataKeyRequiredInLoop),
  ),
  coreRule(
    'server-routes/defineEventHandler-typed',
    'server-routes',
    'warn',
    true,
    defineRule(defineEventHandlerTyped),
  ),
  coreRule(
    'server-routes/validate-body-with-h3-v2',
    'server-routes',
    'warn',
    true,
    defineRule(validateBodyWithH3V2),
  ),
  coreRule(
    'server-routes/createError-on-failure',
    'server-routes',
    'warn',
    true,
    defineRule(createErrorOnFailure),
  ),
  coreRule(
    'hydration/no-document-in-setup',
    'hydration',
    'error',
    true,
    defineRule(noDocumentInSetup),
  ),
  coreRule(
    'hydration/no-browser-global-in-computed',
    'hydration',
    'error',
    true,
    defineRule(noBrowserGlobalInComputed),
  ),
  coreRule(
    'hydration/clientOnly-for-browser-apis',
    'hydration',
    'error',
    true,
    defineRule(clientOnlyForBrowserApis),
  ),
  coreRule(
    'security/no-user-input-in-fetch-url',
    'security',
    'warn',
    true,
    defineRule(noUserInputInFetchUrl),
  ),
];
