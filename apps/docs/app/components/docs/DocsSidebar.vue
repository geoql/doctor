<script setup lang="ts">
import type { NavSection } from '~/types';

defineProps<{
  sections: NavSection[];
}>();

const route = useRoute();

const isActive = (path: string): boolean => route.path === path;
</script>

<template>
  <aside
    class="sticky top-[76px] max-h-[calc(100dvh-92px)] overflow-y-auto py-6 pl-0 pr-4"
    aria-label="Documentation"
  >
    <nav class="space-y-6">
      <div v-for="section in sections" :key="section.path">
        <h6
          class="mb-2 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim"
        >
          <span
            aria-hidden="true"
            class="inline-block size-[5px] rounded-full bg-ink-dim"
          />
          {{ section.title }}
        </h6>
        <ul class="list-none space-y-0 p-0">
          <li v-for="item in section.children" :key="item.path">
            <NuxtLink
              :to="item.path"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              :class="[
                'block px-3 py-1.5 text-[13.5px] leading-snug rounded-md transition-[color,background] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isActive(item.path)
                  ? 'text-ink bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-surface',
              ]"
            >
              {{ item.title }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>
