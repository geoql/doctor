import { check as noMixedOptionsAndCompositionApi } from './no-mixed-options-and-composition-api.js';
import type { SfcRule } from './types.js';

export const SFC_RULES: SfcRule[] = [
  {
    id: 'vue-doctor/sfc/no-mixed-options-and-composition-api',
    check: noMixedOptionsAndCompositionApi,
  },
];
