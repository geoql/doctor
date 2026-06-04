<script setup lang="ts">
const { sections } = useDocsNavigation();

const version = useRuntimeConfig().public.version;

const { openSearch } = useDocsSearch();
onKeyStroke(
  'k',
  (event) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      openSearch();
    }
  },
  { dedupe: true },
);

const sidebarOpen = ref(false);
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}
function closeSidebar() {
  sidebarOpen.value = false;
}

const route = useRoute();
watch(
  () => route.path,
  () => closeSidebar(),
);
</script>

<template>
  <div class="min-h-dvh bg-bg text-ink">
    <!-- ═══ Top nav ═══ -->
    <header class="sticky top-0 z-50 nav-blur border-b border-border-soft">
      <div
        class="mx-auto flex h-[60px] max-w-[1440px] items-center gap-6 px-5 sm:px-8"
      >
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <span
            class="grid size-[22px] place-items-center rounded-sm bg-accent text-ink-on-accent font-mono text-xs font-bold shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_50%,transparent),0_0_0_4px_color-mix(in_oklch,var(--accent)_14%,transparent)]"
            aria-hidden="true"
            >+</span
          >
          <span class="text-sm font-semibold tracking-[-0.01em]">
            the-doctor<em class="not-italic font-normal text-ink-muted"
              >.report</em
            >
          </span>
          <span
            class="inline-flex items-center gap-1.5 h-[22px] rounded-full border border-border bg-surface px-2 font-mono text-[11px] text-ink-muted"
          >
            <span
              aria-hidden="true"
              class="inline-block size-1.5 rounded-full bg-ok shadow-[0_0_0_3px_color-mix(in_oklch,var(--ok)_25%,transparent)]"
            />
            v{{ version }}
          </span>
        </NuxtLink>

        <button
          type="button"
          class="hidden md:inline-flex md:items-center md:gap-2.5 h-8 min-w-[220px] rounded-md border border-border bg-surface px-2.5 text-[13px] text-ink-dim transition-[border-color,color] duration-120 hover:border-ink-muted hover:text-ink-muted"
          aria-label="Search docs"
          @click="openSearch"
        >
          <Icon name="lucide:search" class="size-3.5 opacity-80" />
          <span class="grow text-left">Search docs…</span>
          <span
            class="font-mono text-[11px] text-ink-muted border border-border bg-bg px-1.5 h-5 inline-flex items-center rounded-sm"
            >⌘K</span
          >
        </button>

        <nav class="ml-auto flex items-center gap-1" aria-label="primary">
          <NuxtLink
            to="/getting-started/installation"
            class="rounded-md px-2.5 py-1.5 text-[13.5px] text-ink-muted transition-[color,background] duration-120 hover:text-ink hover:bg-surface"
            >Docs</NuxtLink
          >
          <NuxtLink
            to="https://github.com/geoql/doctor"
            external
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-md px-2.5 py-1.5 text-[13.5px] text-ink-muted transition-[color,background] duration-120 hover:text-ink hover:bg-surface"
            >GitHub</NuxtLink
          >
          <DocsThemeToggle />
        </nav>

        <button
          type="button"
          class="md:hidden ml-2 size-8 inline-flex items-center justify-center rounded-md border border-border bg-surface text-ink-muted"
          aria-label="Toggle navigation"
          @click="toggleSidebar"
        >
          <Icon v-if="!sidebarOpen" name="lucide:menu" class="size-4" />
          <Icon v-else name="lucide:x" class="size-4" />
        </button>
      </div>
    </header>

    <!-- Mobile drawer + overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-[color-mix(in_oklch,var(--bg)_70%,transparent)] md:hidden"
      @click="closeSidebar"
    />
    <aside
      :class="[
        'fixed top-[60px] bottom-0 z-40 w-64 overflow-y-auto border-r border-border-soft bg-bg px-4 py-6 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
      aria-label="Documentation (mobile)"
    >
      <DocsSidebar :sections="sections" />
    </aside>

    <!-- ═══ 2-column shell (sidebar + page) ═══ -->
    <div
      class="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-5 sm:px-8 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]"
    >
      <!-- LEFT: sidebar (md+) -->
      <div class="hidden md:block">
        <DocsSidebar :sections="sections" />
      </div>

      <!-- MIDDLE: page renders its own TOC if it wants one -->
      <main class="min-w-0 py-10 md:py-12">
        <slot />
      </main>
    </div>

    <DocsSearchDialog />
  </div>
</template>
