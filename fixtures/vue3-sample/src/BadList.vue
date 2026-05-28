<script setup lang="ts">
const items = ['this list \u2014 uses em dash in text'];
export const leakedExport = 1;
</script>

<template>
  <ul>
    <li v-if="cond" v-for="item in items">{{ item }}</li>
    <li v-for="item in items">{{ item }}</li>
    <li v-for="item in items" :key="item">{{ item }}</li>
  </ul>
</template>
