<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useState } from '#app';
import type { Heading } from '~/types';

const props = defineProps<{
  headings: Heading[];
}>();

const route = useRoute();
const activeId = useState<string>(`toc-active-${route.path}`, () => '');

onMounted(() => {
  if (props.headings.length === 0) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = new Map<HTMLElement, string>();
  for (const h of props.headings) {
    const el = document.getElementById(h.id);
    if (el) map.set(el, h.id);
  }
  if (map.size === 0) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = map.get(entry.target) ?? '';
        }
      }
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
  );
  map.forEach((_, el) => io.observe(el));
  if (reduce) {
    // No-op; IntersectionObserver respects motion preferences by default.
  }
});
</script>

<template>
  <aside
    class="sticky top-19 max-h-[calc(100dvh-92px)] overflow-y-auto py-10"
    aria-label="On this page"
  >
    <h6
      class="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim"
    >
      On this page
    </h6>
    <ul v-if="headings.length" class="list-none space-y-0 p-0">
      <li v-for="h in headings" :key="h.id">
        <a
          :href="`#${h.id}`"
          :class="[
            'block py-1.25 text-[13px] leading-snug transition-[color,border-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)]',
            h.level === 3 ? 'pl-6 text-[12.5px]' : 'pl-3',
            activeId === h.id
              ? 'text-ink border-l-2 border-accent font-medium'
              : 'text-ink-muted border-l-2 border-transparent hover:text-ink',
          ]"
        >
          {{ h.text }}
        </a>
      </li>
    </ul>
  </aside>
</template>
