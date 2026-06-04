<script setup lang="ts">
import { ArrowRight, Github } from 'lucide-vue-next';

definePageMeta({ layout: 'default' });

const version = useRuntimeConfig().public.version;

usePageSeo({
  title: 'the-doctor.report — Vue 3 / Nuxt 4 Code Audit',
  description:
    'A pair of CLIs and oxlint plugins that audit Vue 3 + Nuxt 4 apps for performance, correctness, security, and AI-agent anti-patterns. Deterministic, offline, MIT.',
  path: '/',
});

const sections = [
  {
    title: 'Getting started',
    path: '/getting-started/installation',
    description:
      'Install with npx, run a first audit, and learn how to read the score.',
  },
  {
    title: 'Rules',
    path: '/rules/vue',
    description:
      'Vue 3 and Nuxt 4 rule catalogue — what each rule catches and why.',
  },
  {
    title: 'CLI reference',
    path: '/cli/reference',
    description:
      'Every flag, every output format, and how the audit pipelines into CI.',
  },
  {
    title: 'Config',
    path: '/config/reference',
    description:
      'doctor.config.ts schema, extends, presets, and per-rule overrides.',
  },
  {
    title: 'Scoring',
    path: '/scoring/how-it-works',
    description:
      'How the 0–100 score is computed, why √-decay matters, and what a regression looks like.',
  },
];
</script>

<template>
  <div>
    <!-- ═══ Hero ═══ -->
    <section class="reveal pb-12">
      <p
        class="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim"
      >
        v{{ version }} · MIT · offline · deterministic
      </p>
      <h1
        class="font-sans font-bold leading-[1.02] tracking-[-0.035em] text-ink m-0 mb-6 text-[clamp(40px,6vw,72px)]"
      >
        the<span class="text-accent">·</span>doctor.report
      </h1>
      <p
        class="m-0 mb-8 max-w-[58ch] text-[clamp(17px,1.5vw,21px)] leading-[1.5] text-ink-muted"
      >
        Your agent writes bad Vue and Nuxt.
        <span class="text-ink">This catches it.</span>
        A pair of CLIs and oxlint plugins that audit Vue 3 + Nuxt 4 apps for
        performance, correctness, security, and AI-agent anti-patterns.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/getting-started/installation"
          class="group inline-flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-bg transition-colors duration-120 hover:bg-transparent hover:text-ink"
        >
          Get Started
          <ArrowRight
            class="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </NuxtLink>
        <NuxtLink
          to="https://github.com/geoql/doctor"
          external
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-ink-muted transition-colors duration-120 hover:border-ink-muted hover:text-ink"
        >
          <Github class="size-3.5" />
          View on GitHub
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ The score card ═══ -->
    <section
      class="reveal mb-16 border border-border bg-surface px-6 py-6 sm:px-8"
    >
      <div class="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div class="font-mono-tabular">
          <div
            class="text-[clamp(56px,7vw,84px)] font-bold leading-none tracking-[-0.04em] text-ink"
          >
            100
          </div>
          <div class="text-xs uppercase tracking-[0.18em] text-ink-dim">
            ceiling · √-decay
          </div>
        </div>
        <div class="text-[15px] leading-[1.55] text-ink-muted">
          Every run produces a single integer from
          <code
            class="font-mono text-[0.85em] bg-bg border border-border-soft px-1.5 py-0.5 rounded text-ink"
            >0</code
          >
          to
          <code
            class="font-mono text-[0.85em] bg-bg border border-border-soft px-1.5 py-0.5 rounded text-ink"
            >100</code
          >. Each finding deducts a fixed amount, scaled by a square-root decay
          so repeats of the same rule hurt less than repeats of
          <em>different</em> rules. The score is deterministic — the same diff
          on the same ruleset always produces the same number — which is what
          makes it useful as a CI gate and a trend line.
        </div>
      </div>
    </section>

    <!-- ═══ Sections ═══ -->
    <section class="reveal">
      <p
        class="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim"
      >
        Navigate
      </p>
      <h2
        class="font-sans font-semibold leading-[1.1] tracking-[-0.03em] text-ink m-0 mb-8 text-[clamp(28px,3.4vw,40px)]"
      >
        Jump into the docs
      </h2>
      <div class="grid gap-px border-t border-border bg-border md:grid-cols-2">
        <NuxtLink
          v-for="section in sections"
          :key="section.path"
          :to="section.path"
          class="group bg-bg p-6 transition-colors duration-120 hover:bg-surface"
        >
          <h3
            class="mb-2 font-sans text-lg font-semibold tracking-tight text-ink group-hover:text-accent"
          >
            {{ section.title }}
          </h3>
          <p class="mb-4 text-sm leading-relaxed text-ink-muted">
            {{ section.description }}
          </p>
          <span
            class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted group-hover:text-ink"
          >
            Read more
            <ArrowRight
              class="size-3 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
