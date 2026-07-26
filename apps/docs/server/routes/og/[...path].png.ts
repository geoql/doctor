// Satori element helper — plain JS objects, no React.
// Satori requires display:flex on divs with 2+ children and chokes on
// children:[]. Builds a flat, null-filtered child list.
function el(
  type: string,
  style: Record<string, unknown>,
  ...children: unknown[]
) {
  const flat = children.flat().filter((c) => c != null && c !== false);
  const props: Record<string, unknown> = { style };
  if (flat.length === 1 && typeof flat[0] === 'string') {
    props.children = flat[0];
  } else if (flat.length > 0) {
    props.children = flat;
  }
  return { type, props };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const title = (query.title as string) || 'the-doctor.report';
  const description =
    (query.description as string) ||
    'Documentation for @geoql/doctor — a Vue 3 / Nuxt 4 code audit. Deterministic, offline, MIT.';

  const element = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      background:
        'linear-gradient(145deg, #29241c 0%, #312b21 50%, #2a2419 100%)',
      fontFamily: 'sans-serif',
      position: 'relative',
      overflow: 'hidden',
    },
    // Top-right orb
    el('div', {
      position: 'absolute',
      top: '-80px',
      right: '-60px',
      width: '300px',
      height: '300px',
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(220,80,60,0.22) 0%, transparent 70%)',
    }),
    // Bottom-left orb
    el('div', {
      position: 'absolute',
      bottom: '-100px',
      left: '-40px',
      width: '350px',
      height: '350px',
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(220,80,60,0.12) 0%, transparent 70%)',
    }),
    // Left accent bar
    el('div', {
      position: 'absolute',
      top: '60px',
      left: '0',
      width: '4px',
      height: '120px',
      borderRadius: '0 4px 4px 0',
      background: 'linear-gradient(180deg, #dc503c, #b03c2a, transparent)',
    }),
    // Content layer
    el(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '60px 64px',
        position: 'relative',
      },
      // Logo
      el(
        'div',
        { display: 'flex', alignItems: 'center', gap: '12px' },
        el(
          'div',
          {
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#f6f1e6',
          },
          'the-doctor.report',
        ),
      ),
      // Title + description
      el(
        'div',
        { display: 'flex', flexDirection: 'column', gap: '20px' },
        el(
          'div',
          {
            fontSize: '64px',
            fontWeight: 800,
            color: '#f6f1e6',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
          },
          title,
        ),
        ...(description
          ? [
              el(
                'div',
                {
                  fontSize: '24px',
                  color: '#b5a989',
                  lineHeight: 1.4,
                  maxWidth: '820px',
                },
                description,
              ),
            ]
          : []),
      ),
      // Branding
      el(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        el(
          'div',
          { display: 'flex', alignItems: 'center', gap: '16px' },
          el(
            'div',
            {
              fontSize: '16px',
              color: '#dc503c',
              fontWeight: 600,
            },
            'Vue 3 · Nuxt 4 · oxlint · offline · MIT',
          ),
        ),
        el(
          'div',
          { fontSize: '18px', color: '#8f8466', fontWeight: 500 },
          'docs.the-doctor.report',
        ),
      ),
    ),
  );

  try {
    const { ImageResponse, cache } = await import('@cf-wasm/og/workerd');
    // Persist WASM/font assets across invocations on CF Pages; without this
    // every request re-initializes Satori (slow + memory churn).
    const ctx = event.context.cloudflare?.context;
    if (ctx) cache.setExecutionContext(ctx);
    const response = await ImageResponse.async(element, {
      width: 1200,
      height: 630,
    });

    const buffer = await response.arrayBuffer();

    setResponseHeaders(event, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      // CF edge ignores Cache-Control for dynamic Worker responses without this.
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      // Social-card fetchers (Slack/Discord/X) are cross-origin; CORP
      // same-origin silently blanks every share card.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });

    return Buffer.from(buffer);
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: `OG generation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});
