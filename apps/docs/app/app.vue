<script setup lang="ts">
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'the-doctor.report',
        url: 'https://docs.the-doctor.report',
        description:
          'Documentation for @geoql/doctor — a Vue 3 / Nuxt 4 code audit. Deterministic, offline, MIT.',
        author: {
          '@type': 'Person',
          name: 'Vinayak Kulkarni',
          url: 'https://vinayakkulkarni.dev',
        },
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
