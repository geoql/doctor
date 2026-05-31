import { check as noMixedOptionsAndCompositionApi } from './no-mixed-options-and-composition-api.js';
import { check as noMixedAppAndRootLayout } from './nuxt/no-mixed-app-and-root-layout.js';
import { check as ogImageDefined } from './nuxt/og-image-defined.js';
import { check as useSeoMetaOnPublicPage } from './nuxt/use-seo-meta-on-public-page.js';
import type { SfcRule } from './types.js';

export const SFC_RULES: SfcRule[] = [
  {
    id: 'vue-doctor/sfc/no-mixed-options-and-composition-api',
    check: noMixedOptionsAndCompositionApi,
  },
  {
    id: 'nuxt-doctor/seo/useSeoMeta-on-public-page',
    check: useSeoMetaOnPublicPage,
  },
  {
    id: 'nuxt-doctor/seo/og-image-defined',
    check: ogImageDefined,
  },
  {
    id: 'nuxt-doctor/ai-slop/no-mixed-app-and-root-layout',
    check: noMixedAppAndRootLayout,
  },
];
