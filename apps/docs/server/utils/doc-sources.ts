import type { DocSource } from './llms';

// The content/ tree is mounted as the `docs` server asset (nuxt.config
// nitro.serverAssets), so it is bundled into the Worker and readable during
// prerender and at runtime alike. Storage keys use `:` as the separator.
export async function readDocSources(): Promise<DocSource[]> {
  const storage = useStorage('assets:docs');
  const keys = await storage.getKeys();
  const sources: DocSource[] = [];
  for (const key of keys) {
    if (!key.endsWith('.md')) continue;
    const raw = await storage.getItem<string>(key);
    if (typeof raw === 'string') {
      sources.push({ file: key.replace(/:/g, '/'), raw });
    }
  }
  return sources;
}
