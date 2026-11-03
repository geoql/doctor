import { readDocSources } from '../utils/doc-sources';
import { buildLlmsTxt, loadDocPages } from '../utils/llms';

// llms.txt index (https://llmstxt.org) built from the docs content tree.
// Returns a native Response so headers work during prerender (h3 2.x
// setResponseHeader throws there — see server/routes/og).
export default defineEventHandler(async () => {
  const { baseUrl } = useRuntimeConfig().public;
  const pages = loadDocPages(await readDocSources());
  return new Response(buildLlmsTxt(pages, baseUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
});
