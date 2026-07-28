import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

// Single source of truth for the version pill: the published CLI version.
// Reading vue-doctor's package.json at build time keeps the docs badge in
// lockstep with the npm release without a network call.
const cliVersion = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../packages/vue-doctor/package.json', import.meta.url),
    ),
    'utf8',
  ),
).version as string;

export default defineNuxtConfig({
  compatibilityDate: '2026-05-26',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
    // Order is load-bearing: robots before sitemap (injects the sitemap URL
    // into robots.txt), and sitemap before @nuxt/content (v8 sitemap only
    // enumerates Content v3 collections registered before it).
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    'motion-v/nuxt',
    'shadcn-nuxt',
    [
      '@nuxtjs/plausible',
      {
        domain: 'docs.the-doctor.report',
        // Self-hosted Plausible: without apiHost the module silently posts
        // events to plausible.io (its default) and the dashboard shows zero hits.
        apiHost: 'https://analytics.geoql.in',
        autoOutboundTracking: true,
      },
    ],
  ],

  css: ['~/assets/css/fonts.css', '~/assets/css/main.css'],

  // The docs root sends visitors straight to the first guide. The marketing
  // landing lives at the-doctor.report; docs.* is purely the reference, so the
  // home route should not be a second landing page.
  routeRules: {
    '/': { redirect: { to: '/getting-started/installation', statusCode: 301 } },
  },

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  // provider:'server' + local bundle keeps icons same-origin (no runtime
  // api.iconify.design call) — matches apps/web + apps/marketing and avoids a
  // CSP-blocked third-party fetch.
  icon: {
    provider: 'server',
    serverBundle: 'local',
    clientBundle: { scan: true, sizeLimitKb: 512 },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en', 'data-theme': 'dark' },
      title: 'the-doctor.report — Vue 3 / Nuxt 4 Code Audit',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Documentation for @geoql/doctor — a Vue 3 / Nuxt 4 code audit. Deterministic, offline, MIT.',
        },
        {
          name: 'theme-color',
          content: '#29241c',
          media: '(prefers-color-scheme: dark)',
        },
        {
          name: 'theme-color',
          content: '#fbf8f1',
          media: '(prefers-color-scheme: light)',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  runtimeConfig: {
    public: {
      version: cliVersion,
      baseUrl:
        process.env.NUXT_PUBLIC_BASE_URL || 'https://docs.the-doctor.report',
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_BASE_URL || 'https://docs.the-doctor.report',
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'material-theme',
            dark: 'material-theme-palenight',
            light: 'material-theme-lighter',
          },
          langs: [
            'bash',
            'json',
            'js',
            'ts',
            'html',
            'css',
            'vue',
            'shell',
            'md',
            'yaml',
            'toml',
            'docker',
          ],
        },
      },
    },
    database: {
      type: 'd1',
      bindingName: 'DB',
    },
  },

  nitro: {
    // Workers, not Pages: the Pages build wraps the WASM OG-image route
    // (@cf-wasm/resvg) in a CJS `require` shim that workerd cannot execute,
    // so `wrangler pages deploy` dies with "require is not defined".
    preset: 'cloudflare_module',
    cloudflare: {
      // Single source of truth — Nitro writes .output/server/wrangler.json at
      // build time, so there is no local wrangler.json. The DB binding backs
      // Nuxt Content v3 (database.type: 'd1').
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'geoql-doctor-docs',
        compatibility_date: '2026-06-16',
        workers_dev: false,
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'geoql-doctor-docs-db',
            database_id: 'c9376a38-b408-4d52-843d-a2cf3225f26e',
          },
        ],
        placement: { mode: 'smart' },
        // Nested logs+traces form (NOT the flat { enabled } form): the flat
        // form expands to logs.* only and hard-defaults traces.enabled to
        // false, so traces must be opted in explicitly.
        observability: {
          logs: {
            enabled: true,
            invocation_logs: true,
            head_sampling_rate: 1,
          },
          traces: {
            enabled: true,
            head_sampling_rate: 1,
          },
        },
      },
    },
    experimental: {
      wasm: true,
    },
    wasm: {
      esmImport: true,
      lazy: true,
    },
    rollupConfig: {
      output: {
        generatedCode: {
          constBindings: true,
        },
      },
    },
    replace: {
      'process.stdout': 'undefined',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
});
