<script setup lang="ts">
defineProps<{
  title?: string;
  to?: string;
}>();
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="group block rounded-lg border border-border bg-surface p-4 transition-colors duration-120 hover:border-accent"
  >
    <h4
      class="mb-1.5 font-sans text-sm font-semibold tracking-tight text-ink group-hover:text-accent"
    >
      {{ title }}
    </h4>
    <div class="text-sm leading-relaxed text-ink-muted">
      <slot />
    </div>
    <span
      class="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted group-hover:text-ink"
    >
      Read more
      <Icon
        name="lucide:arrow-right"
        class="size-3 transition-transform group-hover:translate-x-0.5"
      />
    </span>
  </NuxtLink>
  <div v-else class="border border-border bg-surface p-4">
    <h4 class="mb-1.5 font-sans text-sm font-semibold tracking-tight text-ink">
      {{ title }}
    </h4>
    <div class="text-sm leading-relaxed text-ink-muted">
      <slot />
    </div>
  </div>
</template>
