import { readDocSources } from '../utils/doc-sources';
import { buildLlmsFullTxt, loadDocPages } from '../utils/llms';

// Full plaintext docs (https://llmstxt.org): every page, including the
// generated per-rule pages, in one file.
export default defineEventHandler(async () => {
  const { baseUrl } = useRuntimeConfig().public;
  const pages = loadDocPages(await readDocSources());
  return new Response(buildLlmsFullTxt(pages, baseUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
});
