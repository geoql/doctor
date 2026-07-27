import { check as vForHasKey } from './v-for-has-key.js';
import { check as vIfVForPrecedence } from './v-if-v-for-precedence.js';
import { check as vMemoOnLargeList } from './v-memo-on-large-list.js';
import { check as noInlineObjectPropInList } from './no-inline-object-prop-in-list.js';
import { check as noComputedGetterInTemplateLoop } from './no-computed-getter-in-template-loop.js';
import { check as avoidDeepVBindSpreadInList } from './avoid-deep-v-bind-spread-in-list.js';
import { check as noRandomKey } from './no-random-key.js';
import { check as noVMemoInVapor } from './no-v-memo-in-vapor.js';
import { check as noVHtml } from './no-v-html.js';
import { check as noTargetBlankWithoutRel } from './no-target-blank-without-rel.js';
import { check as noJavascriptUri } from './no-javascript-uri.js';
import { check as noArbitraryTailwindValues } from './no-arbitrary-tailwind-values.js';
import { check as noRawHexColor } from './no-raw-hex-color.js';
import { check as noDefaultTailwindPalette } from './no-default-tailwind-palette.js';
import { check as noImportantUtility } from './no-important-utility.js';
import { check as noHardcodedInlineStyle } from './no-hardcoded-inline-style.js';
import { check as noMissingAlt } from './no-missing-alt.js';
import { check as noAbsurdZIndex } from './no-absurd-z-index.js';
import { check as noGradientText } from './no-gradient-text.js';
import { check as noPureBlackBackground } from './no-pure-black-background.js';
import { check as noDecorativeBlurOrb } from './no-decorative-blur-orb.js';
import { check as noDecorativeGridBackground } from './no-decorative-grid-background.js';
import { check as noRadialHalo } from './no-radial-halo.js';
import { check as noFakeBrowserChrome } from './no-fake-browser-chrome.js';
import { check as noHeroEyebrowChip } from './no-hero-eyebrow-chip.js';
import { check as noUniformFeatureCardGrid } from './no-uniform-feature-card-grid.js';
import { check as noEmojiHeadingDecoration } from './no-emoji-heading-decoration.js';
import { check as noRepeatedGlassSurfaces } from './no-repeated-glass-surfaces.js';
import type { TemplateRule } from './types.js';

export const TEMPLATE_RULES: TemplateRule[] = [
  { id: 'vue-doctor/template/v-for-has-key', check: vForHasKey },
  { id: 'vue-doctor/template/v-if-v-for-precedence', check: vIfVForPrecedence },
  {
    id: 'vue-doctor/template/v-memo-on-large-list',
    check: vMemoOnLargeList,
    disabledBy: ['vue:vapor'],
  },
  {
    id: 'vue-doctor/template/no-inline-object-prop-in-list',
    check: noInlineObjectPropInList,
  },
  {
    id: 'vue-doctor/template/no-computed-getter-in-template-loop',
    check: noComputedGetterInTemplateLoop,
  },
  {
    id: 'vue-doctor/template/avoid-deep-v-bind-spread-in-list',
    check: avoidDeepVBindSpreadInList,
  },
  { id: 'vue-doctor/template/no-random-key', check: noRandomKey },
  {
    id: 'vue-doctor/template/no-v-memo-in-vapor',
    check: noVMemoInVapor,
    requires: ['vue:vapor'],
  },
  { id: 'vue-doctor/security/no-v-html', check: noVHtml },
  {
    id: 'vue-doctor/security/no-target-blank-without-rel',
    check: noTargetBlankWithoutRel,
  },
  { id: 'vue-doctor/security/no-javascript-uri', check: noJavascriptUri },
  {
    id: 'vue-doctor/design/no-arbitrary-tailwind-values',
    check: noArbitraryTailwindValues,
  },
  { id: 'vue-doctor/design/no-raw-hex-color', check: noRawHexColor },
  {
    id: 'vue-doctor/design/no-default-tailwind-palette',
    check: noDefaultTailwindPalette,
  },
  { id: 'vue-doctor/design/no-important-utility', check: noImportantUtility },
  {
    id: 'vue-doctor/design/no-hardcoded-inline-style',
    check: noHardcodedInlineStyle,
  },
  { id: 'vue-doctor/design/no-missing-alt', check: noMissingAlt },
  { id: 'vue-doctor/design/no-absurd-z-index', check: noAbsurdZIndex },
  { id: 'vue-doctor/design/no-gradient-text', check: noGradientText },
  {
    id: 'vue-doctor/design/no-pure-black-background',
    check: noPureBlackBackground,
  },
  {
    id: 'vue-doctor/design/no-decorative-blur-orb',
    check: noDecorativeBlurOrb,
  },
  {
    id: 'vue-doctor/design/no-decorative-grid-background',
    check: noDecorativeGridBackground,
  },
  { id: 'vue-doctor/design/no-radial-halo', check: noRadialHalo },
  {
    id: 'vue-doctor/design/no-fake-browser-chrome',
    check: noFakeBrowserChrome,
  },
  { id: 'vue-doctor/design/no-hero-eyebrow-chip', check: noHeroEyebrowChip },
  {
    id: 'vue-doctor/design/no-uniform-feature-card-grid',
    check: noUniformFeatureCardGrid,
  },
  {
    id: 'vue-doctor/design/no-emoji-heading-decoration',
    check: noEmojiHeadingDecoration,
  },
  {
    id: 'vue-doctor/design/no-repeated-glass-surfaces',
    check: noRepeatedGlassSurfaces,
  },
];
