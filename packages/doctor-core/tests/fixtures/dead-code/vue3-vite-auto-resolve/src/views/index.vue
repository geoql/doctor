<script setup lang="ts">
const dark = useDark();
const store = useSessionStore();
</script>
<template>
  <AppButton>{{ formatTitle(store.name) }} {{ dark }}</AppButton>
</template>
