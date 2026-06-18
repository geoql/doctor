import { renderRulePrompt } from '@geoql/doctor-core';

// Rule ids have 3 segments (e.g. `vue-doctor/template/v-for-has-key`), so a
// catch-all reconstructs the full id from the path after `/prompts/rules/`.
// The `.md` suffix is stripped from the final segment. Returns a native
// Response — h3 2.x `setResponseHeader` throws during prerender when
// `event.response.headers` is undefined (see server/routes/og).
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? '';
  const ruleId = decodeURIComponent(slug).replace(/\.md$/, '');
  const markdown = renderRulePrompt(ruleId);

  if (markdown === null) {
    return new Response(`Unknown rule: ${ruleId}\n`, {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
});
