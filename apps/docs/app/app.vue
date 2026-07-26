<script setup lang="ts">
// Site-wide Schema.org @graph: Organization is the canonical brand entity
// (sameAs cross-links make it two-way verifiable), WebSite references it by
// @id. WebSite has no `author` property in Schema.org — the Person lives
// under Organization.founder instead.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://the-doctor.report/#org',
            name: 'the-doctor.report',
            url: 'https://the-doctor.report',
            description:
              'Deterministic code-health audits for Vue 3 and Nuxt 4 codebases.',
            founder: {
              '@type': 'Person',
              '@id': 'https://vinayakkulkarni.dev/#person',
              name: 'Vinayak Kulkarni',
              url: 'https://vinayakkulkarni.dev',
            },
            sameAs: [
              'https://github.com/geoql/doctor',
              'https://jsr.io/@geoql',
              'https://www.npmjs.com/package/@geoql/vue-doctor',
              'https://x.com/geoql',
            ],
          },
          {
            '@type': 'WebSite',
            '@id': 'https://docs.the-doctor.report/#website',
            name: 'the-doctor.report docs',
            url: 'https://docs.the-doctor.report',
            description:
              'Documentation for @geoql/doctor — a Vue 3 / Nuxt 4 code audit. Deterministic, offline, MIT.',
            publisher: { '@id': 'https://the-doctor.report/#org' },
          },
        ],
      }),
    },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
