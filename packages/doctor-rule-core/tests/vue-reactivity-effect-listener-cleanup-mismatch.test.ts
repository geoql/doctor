import { describe, expect, it } from 'vitest';
import { effectListenerCleanupMismatch } from '../src/rules/vue/reactivity/effect-listener-cleanup-mismatch.js';
import { runRule } from './run-rule.js';

const rule = effectListenerCleanupMismatch;

describe('reactivity/effect-listener-cleanup-mismatch', () => {
  it('fires when cleanup removes a different handler than was added', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', onResize);
         onCleanup(() => window.removeEventListener('resize', otherHandler));
       });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('detach');
  });

  it('fires when the added handler is an inline arrow (never removable)', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', () => rerun());
         onCleanup(() => window.removeEventListener('resize', () => rerun()));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when capture flags differ between add and remove', () => {
    const reports = runRule(
      rule,
      `watch(src, (v, o, onCleanup) => {
         window.addEventListener('scroll', onScroll, true);
         onCleanup(() => window.removeEventListener('scroll', onScroll));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when the same named handler and flags are used', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', onResize);
         onCleanup(() => window.removeEventListener('resize', onResize));
       });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when both sides pass the same capture boolean', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('scroll', onScroll, true);
         onCleanup(() => window.removeEventListener('scroll', onScroll, true));
       });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when both sides pass matching object capture options', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('scroll', handlers.onScroll, { capture: true });
         onCleanup(() => window.removeEventListener('scroll', handlers.onScroll, { capture: true }));
       });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('fires when capture object lacks a capture property on only one side', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('scroll', onScroll, { passive: true });
         onCleanup(() => window.removeEventListener('scroll', onScroll, true));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats dynamic capture options as unknown', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('scroll', onScroll, options);
         onCleanup(() => window.removeEventListener('scroll', onScroll, true));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for mismatched nested member handlers', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', handlers.onResize);
         onCleanup(() => window.removeEventListener('resize', handlers.other));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when no listener exists for the removed event', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', onResize);
         onCleanup(() => window.removeEventListener('scroll', other));
       });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire outside watch/watchEffect/onMounted', () => {
    const reports = runRule(
      rule,
      `function setup() {
         window.addEventListener('resize', a);
         window.removeEventListener('resize', b);
       }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when there is no removeEventListener at all (watch-without-cleanup covers that)', () => {
    const reports = runRule(
      rule,
      `watchEffect(() => { window.addEventListener('resize', onResize); });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('matches add/remove pairs by event name', () => {
    const reports = runRule(
      rule,
      `onMounted(() => {
         window.addEventListener('resize', onResize);
         window.addEventListener('scroll', onScroll);
         onUnmounted(() => {
           window.removeEventListener('resize', onResize);
           window.removeEventListener('scroll', wrongHandler);
         });
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('ignores non-literal event names (cannot pair reliably)', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener(evt, onResize);
         onCleanup(() => window.removeEventListener(evt, other));
       });`,
    );
    expect(reports).toHaveLength(0);
  });
  it('treats a non-literal capture option value as unknown and reports mismatch', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('scroll', onScroll, { capture: flag });
         onCleanup(() => window.removeEventListener('scroll', onScroll));
       });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('ignores call-based handler bases it cannot key', () => {
    const reports = runRule(
      rule,
      `watchEffect((onCleanup) => {
         window.addEventListener('resize', onResize);
         onCleanup(() => window.removeEventListener('resize', getHandlers().onResize));
       });`,
    );
    expect(reports).toHaveLength(1);
  });
});
