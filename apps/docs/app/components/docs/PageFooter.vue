<script setup lang="ts">
import type { NavItem } from '~/types';

defineProps<{
  prev: NavItem | null;
  next: NavItem | null;
  editUrl?: string;
  lastUpdated?: string;
  version?: string;
}>();
</script>

<template>
  <footer class="mt-20">
    <div
      class="grid grid-cols-1 gap-4 pt-8 border-t border-border-soft sm:grid-cols-2"
    >
      <NuxtLink
        v-if="prev"
        :to="prev.path"
        :aria-label="`Previous: ${prev.title}`"
        class="group block rounded-lg border border-border bg-surface px-4.5 py-4 transition-[border-color,box-shadow,background] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent hover:bg-[color-mix(in_oklch,var(--accent)_3%,var(--surface))] hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_30%,transparent)]"
      >
        <div
          class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim"
        >
          ← Previous
        </div>
        <div class="mt-1 text-base font-medium tracking-[-0.01em] text-ink">
          {{ prev.title }}
        </div>
      </NuxtLink>
      <div v-else />

      <NuxtLink
        v-if="next"
        :to="next.path"
        :aria-label="`Next: ${next.title}`"
        class="group block rounded-lg border border-border bg-surface px-4.5 py-4 text-right transition-[border-color,box-shadow,background] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent hover:bg-[color-mix(in_oklch,var(--accent)_3%,var(--surface))] hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_30%,transparent)]"
      >
        <div
          class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim"
        >
          Next →
        </div>
        <div class="mt-1 text-base font-medium tracking-[-0.01em] text-ink">
          {{ next.title }}
        </div>
      </NuxtLink>
    </div>

    <div
      class="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs text-ink-dim"
    >
      <a
        v-if="editUrl"
        :href="editUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-ink-muted transition-colors duration-120 hover:text-ink"
        >Edit on GitHub</a
      >
      <span aria-hidden="true">·</span>
      <span v-if="lastUpdated">Last updated {{ lastUpdated }}</span>
      <span v-if="version" aria-hidden="true">·</span>
      <span v-if="version">v{{ version }}</span>
    </div>
  </footer>
</template>
