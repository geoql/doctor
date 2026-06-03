export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },

  modules: [
    '@nuxt/content',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/eslint',
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

  css: ['~/assets/css/main.css'],

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
      nodeCompat: true,
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

  fonts: {
    families: [
      {
        name: 'Geist',
        provider: 'google',
        weights: [300, 400, 500, 600, 700, 800],
      },
      {
        name: 'Geist Mono',
        provider: 'google',
        weights: [300, 400, 500, 600, 700],
      },
    ],
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
});
