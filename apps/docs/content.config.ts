import { defineCollection, defineContentConfig } from '@nuxt/content';
import { defineSitemapSchema } from '@nuxtjs/sitemap/content';
import { z } from 'zod';

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
