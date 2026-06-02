<script setup lang="ts">
const isClient = process.client;
const ids = [1, 2, 3];
for (const id of ids) {
  const { data } = await useAsyncData(() => $fetch('/api/' + id));
}
</script>
<template>
  <div>{{ isClient }}</div>
</template>
