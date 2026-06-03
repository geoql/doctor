import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-05-26',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
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
        autoOutboundTracking: true,
      },
    ],
  ],

  css: ['~/assets/css/fonts.css', '~/assets/css/main.css'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
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
      baseUrl:
        process.env.NUXT_PUBLIC_BASE_URL || 'https://docs.the-doctor.report',
    },
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
    preset: 'cloudflare-pages',
    cloudflare: {
      // Single source of truth — Nitro writes dist/_worker.js/wrangler.json at
      // build time, so there is no local wrangler.json. The DB binding backs
      // Nuxt Content v3 (database.type: 'd1').
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'geoql-doctor-docs',
        compatibility_date: '2026-05-26',
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'geoql-doctor-docs-db',
            database_id: 'c9376a38-b408-4d52-843d-a2cf3225f26e',
          },
        ],
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
