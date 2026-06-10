<script setup lang="ts">
import Fuse from 'fuse.js';
import { Search } from 'lucide-vue-next';

const { open, closeSearch } = useDocsSearch();
const router = useRouter();

interface SearchSection {
  id: string;
  title: string;
  titles: string[];
  level: number;
  content: string;
}

// Not awaited + client-only: a top-level await would make this an async
// component needing <Suspense>, which prevents it mounting inside the layout.
// Search is a client interaction, so the sections load lazily on the client.
const { data: sections } = useAsyncData(
  'docs-search-sections',
  () =>
    queryCollectionSearchSections('content', {
      ignoredTags: ['code', 'pre', 'style'],
    }),
  { server: false, lazy: true },
);

const fuse = computed(
  () =>
    new Fuse((sections.value ?? []) as SearchSection[], {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'content', weight: 0.3 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
    }),
);

const query = ref('');
const activeIndex = ref(0);

const results = computed(() => {
  const q = query.value.trim();
  if (!q) return [];
  return fuse.value.search(q, { limit: 24 }).map((r) => r.item);
});

watch(results, () => {
  activeIndex.value = 0;
});

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = '';
    activeIndex.value = 0;
  }
});

function go(id: string) {
  closeSearch();
  void nextTick(() => router.push(id));
}

function onKeydown(event: KeyboardEvent) {
  if (!results.value.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % results.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value =
      (activeIndex.value - 1 + results.value.length) % results.value.length;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const hit = results.value[activeIndex.value];
    if (hit) go(hit.id);
  }
}
</script>

<template>
  <!-- ClientOnly (not Teleport to body): the dialog is position:fixed so it
       needs no portal, and Teleport-to-body during SSR is a known Nuxt
       hydration-mismatch source (nuxt/nuxt#24207). Search is client-only. -->
  <ClientOnly>
    <Transition name="search-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[12vh]"
        @click.self="closeSearch"
      >
        <div
          aria-hidden="true"
          class="absolute inset-0 bg-[color-mix(in_oklch,var(--bg)_72%,transparent)] backdrop-blur-sm"
          @click="closeSearch"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search docs"
          class="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-12px_color-mix(in_oklch,var(--bg)_80%,#000)]"
        >
          <div class="flex items-center gap-3 border-b border-border-soft px-4">
            <Search class="size-4 shrink-0 text-ink-dim" />
            <input
              v-model="query"
              type="text"
              placeholder="Search docs…"
              autofocus
              class="h-12 grow bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-dim"
              @keydown="onKeydown"
            />
            <kbd
              class="hidden sm:inline-flex h-5 items-center rounded-sm border border-border bg-bg px-1.5 font-mono text-[11px] text-ink-muted"
            >
              esc
            </kbd>
          </div>

          <ul
            v-if="results.length"
            class="max-h-[min(60vh,420px)] list-none overflow-y-auto p-2"
          >
            <li v-for="(hit, i) in results" :key="hit.id">
              <button
                type="button"
                class="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-100"
                :class="
                  i === activeIndex
                    ? 'bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] text-ink'
                    : 'text-ink-muted hover:bg-[color-mix(in_oklch,var(--accent)_6%,transparent)]'
                "
                @click="go(hit.id)"
                @mouseenter="activeIndex = i"
              >
                <span class="text-[14px] font-medium text-ink">
                  {{ hit.title }}
                </span>
                <span
                  v-if="hit.titles.length > 1"
                  class="font-mono text-[11px] text-ink-dim"
                >
                  {{ hit.titles.slice(0, -1).join(' › ') }}
                </span>
              </button>
            </li>
          </ul>

          <div
            v-else
            class="px-4 py-10 text-center font-mono text-[13px] text-ink-dim"
          >
            {{
              query.trim()
                ? `No results for “${query}”`
                : 'Type to search the docs.'
            }}
          </div>
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>

<style scoped>
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.15s ease;
}
.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>
