import { classifyOutbound } from '~/utils/analytics';

/**
 * One delegated listener tracks every funnel outbound link — header, landing
 * CTA, page footer and links inside rendered Markdown — without wiring each
 * anchor. `location` comes from the nearest `data-analytics-location`
 * ancestor, falling back to `content`.
 */
export default defineNuxtPlugin(() => {
  const { track } = useAnalytics();

  function onClick(event: MouseEvent) {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const target = classifyOutbound(anchor.href);
    if (!target) return;
    const location =
      anchor
        .closest('[data-analytics-location]')
        ?.getAttribute('data-analytics-location') ?? 'content';
    track('outbound_click', { target, location, href: anchor.href });
  }

  // Capture phase: runs before navigation for both left and middle clicks.
  document.addEventListener('click', onClick, { capture: true });
  document.addEventListener('auxclick', onClick, { capture: true });
});
