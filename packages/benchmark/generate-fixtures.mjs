import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VUE_COUNT = 250;
const NUXT_COUNT = 50;
const SEED = 42;

const SCRIPT_VIOLATIONS = [
  {
    id: 'no-return',
    code: 'const count = computed(() => { count.value++ })',
    label: 'computed without return',
  },
  {
    id: 'unused-var',
    code: 'const unused = ref(0); const used = computed(() => used.value)',
    label: 'unused variable',
  },
  {
    id: 'em-dash',
    code: 'const str = ref("foo——bar")',
    label: 'em-dash in string',
  },
  {
    id: 'await-top-level',
    code: 'const data = await fetch("/api")',
    label: 'top-level await (non-async setup)',
  },
  {
    id: 'ref-wrong-name',
    code: 'const myCount = ref(0); const double = computed(() => myCount.value * 2)',
    label: 'ref without suffix convention',
  },
];

const TEMPLATE_VIOLATIONS = [
  {
    id: 'v-for-no-key',
    code: '<div v-for="item in items">{{ item }}</div>',
    label: 'v-for without :key',
  },
  {
    id: 'v-if-v-for',
    code: '<div v-for="i in list" v-if="show"><span>{{ i }}</span></div>',
    label: 'v-if with v-for',
  },
  {
    id: 'same-key',
    code: '<div v-for="item in items" :key="item.id"><span v-for="x in items" :key="item.id">',
    label: 'duplicate :key value',
  },
  {
    id: 'missing-colon',
    code: '<div v-for="item in items" key="item.id">',
    label: 'key without v-bind:',
  },
];

const CLEAN_TEMPLATES = [
  '<template><div class="card"><h2>{{ title }}</h2><p>{{ description }}</p></div></template>',
  '<template><nav><a v-for="link in links" :key="link.id" :href="link.url">{{ link.label }}</a></nav></template>',
  '<template><section><header><h1>Welcome</h1></header><main><p>Content here</p></main></section></template>',
  '<template><ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul></template>',
  '<template><button :disabled="disabled" @click="handleClick">{{ label }}</button></template>',
];

const CLEAN_SCRIPTS = [
  'const count = ref(0); const double = computed(() => count.value * 2);',
  'const items = ref([]); const add = (item) => items.value.push(item);',
  'const loading = ref(false); const data = ref(null);',
  'const name = ref(""); const upper = computed(() => name.value.toUpperCase());',
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateScriptSetup(violation, seed) {
  const rng = seededRandom(seed);
  const cleanScript = pick(CLEAN_SCRIPTS, rng);
  if (!violation) return cleanScript;
  const v = pick(
    SCRIPT_VIOLATIONS.filter((v) => v.id === violation),
    rng,
  );
  return v.code;
}

function generateTemplate(violation, seed) {
  const rng = seededRandom(seed + 1000);
  if (!violation) return pick(CLEAN_TEMPLATES, rng);
  const v = pick(
    TEMPLATE_VIOLATIONS.filter((v) => v.id === violation),
    rng,
  );
  return v.code;
}

function generateSfc(seed, isNuxt) {
  const rng = seededRandom(seed);
  const templateViolation =
    rng() < 0.4 ? pick(TEMPLATE_VIOLATIONS, rng).id : null;
  const scriptViolation = rng() < 0.4 ? pick(SCRIPT_VIOLATIONS, rng).id : null;
  const template = generateTemplate(templateViolation, seed);
  const scriptSetup = generateScriptSetup(scriptViolation, seed + 2000);
  const hasAsync = scriptViolation === 'await-top-level';
  const asyncAttr = hasAsync ? ' async' : '';
  return `<template>
${template.replace('<template>', '').replace('</template>', '')}
</template>

<script setup${asyncAttr}>
${scriptSetup}
${isNuxt ? 'const route = useRoute();' : ''}
</script>
`;
}

function generateFixtures() {
  const baseDir = new URL('.', import.meta.url).pathname;
  const vueDir = join(baseDir, 'fixtures', 'vue');
  const nuxtDir = join(baseDir, 'fixtures', 'nuxt');

  mkdirSync(vueDir, { recursive: true });
  mkdirSync(nuxtDir, { recursive: true });

  for (let i = 0; i < VUE_COUNT; i++) {
    const content = generateSfc(SEED + i, false);
    writeFileSync(
      join(vueDir, `component-${String(i).padStart(4, '0')}.vue`),
      content,
    );
  }

  for (let i = 0; i < NUXT_COUNT; i++) {
    const content = generateSfc(SEED + VUE_COUNT + i, true);
    writeFileSync(
      join(nuxtDir, `page-${String(i).padStart(4, '0')}.vue`),
      content,
    );
  }

  console.log(`Generated ${VUE_COUNT} Vue SFCs in fixtures/vue/`);
  console.log(`Generated ${NUXT_COUNT} Nuxt SFCs in fixtures/nuxt/`);
}

generateFixtures();
