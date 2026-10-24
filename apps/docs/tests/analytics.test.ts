import { describe, expect, it, vi } from 'vitest';
import {
  classifyOutbound,
  createAnalytics,
  isInstallCommand,
  ruleIdFromPage,
} from '~/utils/analytics';
import { isAutomationBrowser } from '~/utils/automation-browser';

function stubHandles() {
  return {
    ga: { gtag: vi.fn() },
    plausible: { plausible: vi.fn() },
    openpanel: { track: vi.fn(), identify: vi.fn() },
  };
}

describe('createAnalytics', () => {
  it('fans one track() call out to GA4, Plausible and OpenPanel', () => {
    const handles = stubHandles();
    const { track, isEnabled } = createAnalytics(handles);
    const props = {
      target: 'github',
      location: 'header',
      href: 'https://github.com/geoql/doctor',
    } as const;

    track('outbound_click', props);

    expect(isEnabled).toBe(true);
    expect(handles.ga.gtag).toHaveBeenCalledExactlyOnceWith(
      'event',
      'outbound_click',
      props,
    );
    expect(handles.plausible.plausible).toHaveBeenCalledExactlyOnceWith(
      'outbound_click',
      { props },
    );
    expect(handles.openpanel.track).toHaveBeenCalledExactlyOnceWith(
      'outbound_click',
      props,
    );
  });

  it('identify() reaches GA4 user properties and the OpenPanel profile', () => {
    const handles = stubHandles();
    createAnalytics(handles).identify('u1', { plan: 'free' });
    expect(handles.ga.gtag).toHaveBeenCalledWith('set', 'user_properties', {
      user_id: 'u1',
      plan: 'free',
    });
    expect(handles.openpanel.identify).toHaveBeenCalledWith({
      profileId: 'u1',
      properties: { plan: 'free' },
    });
  });

  it('is a safe no-op with no handles (SSR / automation browsers)', () => {
    const { track, identify, isEnabled } = createAnalytics({});
    expect(isEnabled).toBe(false);
    expect(() => {
      track('code_copied', { page: '/', language: 'ts' });
      identify('u1');
    }).not.toThrow();
  });
});

describe('classifyOutbound', () => {
  it.each([
    ['https://github.com/geoql/doctor', 'github'],
    ['https://github.com/geoql/doctor/edit/main/apps/docs/x.md', 'github'],
    ['https://github.com/geoql/doctor-action', 'github_action'],
    [
      'https://github.com/marketplace/actions/doctor-vue-nuxt-code-audit',
      'github_action',
    ],
    ['https://www.npmjs.com/package/@geoql/vue-doctor', 'npm'],
    ['https://npmjs.com/package/@geoql/nuxt-doctor', 'npm'],
    ['https://jsr.io/@geoql', 'jsr'],
    ['https://app.the-doctor.report/?utm_source=docs', 'app'],
  ])('%s → %s', (href, target) => {
    expect(classifyOutbound(href)).toBe(target);
  });

  it.each([
    'https://docs.the-doctor.report/rules/vue',
    'https://example.com',
    'mailto:hi@geoql.in',
    'not a url',
  ])('%s → null', (href) => {
    expect(classifyOutbound(href)).toBeNull();
  });
});

describe('isInstallCommand', () => {
  it.each([
    'npx -y @geoql/vue-doctor',
    'pnpm dlx @geoql/nuxt-doctor .',
    'pnpm add -D @geoql/nuxt-doctor',
    'bunx @geoql/vue-doctor --fail-on warn',
    'pnpm exec vue-doctor',
  ])('detects %s', (code) => {
    expect(isInstallCommand(code)).toBe(true);
  });

  it.each([
    "import { defineConfig } from '@geoql/doctor-core';",
    'pnpm install',
  ])('ignores %s', (code) => {
    expect(isInstallCommand(code)).toBe(false);
  });
});

describe('ruleIdFromPage', () => {
  it('reads the rule id from the backticked title', () => {
    expect(
      ruleIdFromPage(
        '/rules/vue-doctor/reactivity/watch-without-cleanup',
        '`vue-doctor/reactivity/watch-without-cleanup`',
      ),
    ).toBe('vue-doctor/reactivity/watch-without-cleanup');
  });

  it('falls back to the path when the title is missing', () => {
    expect(ruleIdFromPage('/rules/vue/max-props', undefined)).toBe(
      'vue/max-props',
    );
  });

  it('skips category overviews and non-rule pages', () => {
    expect(ruleIdFromPage('/rules/vue', 'Vue rules')).toBeNull();
    expect(ruleIdFromPage('/rules/nuxt', 'Nuxt rules')).toBeNull();
    expect(
      ruleIdFromPage('/getting-started/installation', 'Install'),
    ).toBeNull();
  });
});

describe('isAutomationBrowser', () => {
  it('is true only when navigator.webdriver is true', () => {
    expect(isAutomationBrowser({ webdriver: true })).toBe(true);
    expect(isAutomationBrowser({ webdriver: false })).toBe(false);
    expect(isAutomationBrowser(undefined)).toBe(false);
  });
});
