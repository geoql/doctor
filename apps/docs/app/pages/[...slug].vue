<script setup lang="ts">
import { computed } from 'vue';
import type { TocLink } from '~/types';

const route = useRoute();

const path = computed(() =>
  route.path.endsWith('/') && route.path !== '/'
    ? route.path.slice(0, -1)
    : route.path,
);

const { data: page } = await useAsyncData(`page-${path.value}`, () =>
  queryCollection('content').path(path.value).first(),
);

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: `Page not found: ${path.value}`,
    fatal: true,
  });
}

const { sections } = useDocsNavigation();

const allItems = computed(() => sections.flatMap((s) => s.children));
const currentIndex = computed(() =>
  allItems.value.findIndex((item) => item.path === path.value),
);
const prevItem = computed(() =>
  currentIndex.value > 0
    ? (allItems.value[currentIndex.value - 1] ?? null)
    : null,
);
const nextItem = computed(() =>
  currentIndex.value < allItems.value.length - 1
    ? (allItems.value[currentIndex.value + 1] ?? null)
    : null,
);

// Top-level section (first crumb)
const sectionTitle = computed(() => {
  for (const s of sections) {
    if (s.children.some((c) => c.path === path.value)) return s.title;
  }
  return 'Docs';
});

// Build breadcrumbs: [Docs, <Section>, <Title>]
const crumbs = computed(() => {
  const out: { label: string; to?: string }[] = [
    { label: 'Docs', to: '/getting-started/installation' },
  ];
  if (sectionTitle.value && sectionTitle.value !== 'Docs') {
    const section = sections.find((s) => s.title === sectionTitle.value);
    if (section) {
      out.push({ label: section.title, to: section.children[0]?.path });
    }
  }
  if (page.value?.title && page.value.title !== sectionTitle.value) {
    out.push({ label: page.value.title });
  }
  return out;
});

const headings = computed(() => {
  const toc = (page.value?.body as { toc?: { links?: TocLink[] } } | undefined)
    ?.toc;
  const out: { id: string; text: string; level: number }[] = [];
  function walk(links: TocLink[]) {
    for (const l of links) {
      if (l.depth === 2 || l.depth === 3) {
        out.push({ id: l.id, text: l.text, level: l.depth });
      }
      if (l.children?.length) walk(l.children);
    }
  }
  if (toc?.links) walk(toc.links);
  return out;
});

const editUrl = computed(() => {
  const slug = path.value.replace(/^\//, '');
  return `https://github.com/geoql/doctor/edit/main/apps/docs/content/${slug}.md`;
});

usePageSeo({
  title: page.value?.title
    ? `${page.value.title} · the-doctor.report`
    : 'the-doctor.report',
  description:
    page.value?.description ??
    'Documentation for @geoql/doctor — a Vue 3 / Nuxt 4 code audit.',
  path: path.value,
});
</script>

<template>
  <div v-if="page" class="grid gap-12 xl:grid-cols-[minmax(0,1fr)_220px]">
    <article class="min-w-0 max-w-190">
      <DocsPageHeader
        :title="page.title ?? 'Untitled'"
        :description="page.description"
        :crumbs="crumbs"
      />
      <div class="prose">
        <ContentRenderer :value="page" />
      </div>
      <DocsPageFooter :prev="prevItem" :next="nextItem" :edit-url="editUrl" />
    </article>
    <aside class="hidden xl:block">
      <DocsToc :headings="headings" />
    </aside>
  </div>
</template>
