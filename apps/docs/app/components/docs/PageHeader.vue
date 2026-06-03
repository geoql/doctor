<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  crumbs?: { label: string; to?: string }[];
}>();
</script>

<template>
  <header class="mb-10">
    <nav
      v-if="crumbs && crumbs.length"
      class="mb-6 flex items-center gap-2 font-mono text-xs text-ink-dim"
      aria-label="Breadcrumb"
    >
      <template v-for="(c, i) in crumbs" :key="i">
        <NuxtLink
          v-if="c.to"
          :to="c.to"
          class="text-ink-muted transition-colors duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-ink"
        >
          {{ c.label }}
        </NuxtLink>
        <span v-else class="text-ink">{{ c.label }}</span>
        <span v-if="i < crumbs.length - 1" class="text-ink-dim">/</span>
      </template>
    </nav>

    <h1
      class="font-sans text-[clamp(32px,4vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] text-ink m-0 mb-4"
    >
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="m-0 max-w-[64ch] text-[clamp(17px,1.4vw,19px)] leading-[1.55] text-ink-muted"
    >
      {{ description }}
    </p>
  </header>
</template>
