import { renderAgentPlaybook } from '@geoql/doctor-core';

// Canonical agent playbook served as markdown. Returns a native Response —
// h3 2.x `setResponseHeader` throws during prerender when
// `event.response.headers` is undefined (see server/routes/og).
export default defineEventHandler(() => {
  return new Response(renderAgentPlaybook(), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
});
