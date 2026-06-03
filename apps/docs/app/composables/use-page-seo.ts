export function usePageSeo(options: {
  title: string;
  description: string;
  path: string;
  ogDescription?: string;
  ogImageAlt?: string;
  robots?: string;
}) {
  const config = useRuntimeConfig();
  const baseUrl = config.public.baseUrl || 'https://docs.the-doctor.report';

  const canonicalUrl = `${baseUrl}${options.path}`;
  const ogDesc = options.ogDescription ?? options.description;
  const ogImageAlt = options.ogImageAlt ?? options.title;

  const ogImageUrl = `${baseUrl}/og${options.path}.png?title=${encodeURIComponent(
    options.title,
  )}&description=${encodeURIComponent(ogDesc)}`;

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl }],
  });

  useSeoMeta({
    title: options.title,
    description: options.description,
    ...(options.robots ? { robots: options.robots } : {}),
    ogType: 'website',
    ogUrl: canonicalUrl,
    ogTitle: options.title,
    ogDescription: ogDesc,
    ogImage: ogImageUrl,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: ogImageAlt,
    ogSiteName: 'the-doctor.report',
    twitterCard: 'summary_large_image',
    twitterTitle: options.title,
    twitterDescription: ogDesc,
    twitterImage: ogImageUrl,
    twitterImageAlt: ogImageAlt,
  });
}
