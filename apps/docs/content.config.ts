import { defineCollection, defineContentConfig, z } from '@nuxt/content';
import { defineSitemapSchema } from '@nuxtjs/sitemap/content';

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        description: z.string().optional(),
        sitemap: defineSitemapSchema(),
      }),
    }),
  },
});
