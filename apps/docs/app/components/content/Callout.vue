<script setup lang="ts">
import { Info, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-vue-next';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    type?: 'info' | 'warning' | 'tip' | 'success' | 'error';
  }>(),
  { type: 'info' },
);

interface CalloutConfig {
  icon: typeof Info;
  bg: string;
  border: string;
  borderLeft: string;
  label: string;
  labelColor: string;
}

const config = computed<CalloutConfig>(() => {
  switch (props.type) {
    case 'warning':
      return {
        icon: AlertTriangle,
        bg: 'bg-[color-mix(in_oklch,var(--warn)_7%,var(--surface))]',
        border: 'border-[color-mix(in_oklch,var(--warn)_30%,var(--border))]',
        borderLeft: 'border-l-[3px] border-l-warn',
        label: 'Warning',
        labelColor: 'text-warn',
      };
    case 'tip':
      return {
        icon: Lightbulb,
        bg: 'bg-[color-mix(in_oklch,var(--ok)_7%,var(--surface))]',
        border: 'border-[color-mix(in_oklch,var(--ok)_30%,var(--border))]',
        borderLeft: 'border-l-[3px] border-l-ok',
        label: 'Tip',
        labelColor: 'text-ok',
      };
    case 'success':
      return {
        icon: CheckCircle,
        bg: 'bg-[color-mix(in_oklch,var(--ok)_7%,var(--surface))]',
        border: 'border-[color-mix(in_oklch,var(--ok)_30%,var(--border))]',
        borderLeft: 'border-l-[3px] border-l-ok',
        label: 'Success',
        labelColor: 'text-ok',
      };
    case 'error':
      return {
        icon: AlertTriangle,
        bg: 'bg-[color-mix(in_oklch,var(--error)_7%,var(--surface))]',
        border: 'border-[color-mix(in_oklch,var(--error)_30%,var(--border))]',
        borderLeft: 'border-l-[3px] border-l-error',
        label: 'Error',
        labelColor: 'text-error',
      };
    default:
      return {
        icon: Info,
        bg: 'bg-[color-mix(in_oklch,var(--info)_7%,var(--surface))]',
        border: 'border-[color-mix(in_oklch,var(--info)_30%,var(--border))]',
        borderLeft: 'border-l-[3px] border-l-info',
        label: 'Info',
        labelColor: 'text-info',
      };
  }
});
</script>

<template>
  <aside
    :class="[
      'my-6 rounded-md px-4 py-3.5 pl-[18px] text-[14.5px] leading-[1.55] text-ink border',
      config.bg,
      config.border,
      config.borderLeft,
    ]"
  >
    <div
      :class="[
        'mb-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]',
        config.labelColor,
      ]"
    >
      <component :is="config.icon" class="size-3" />
      {{ config.label }}
    </div>
    <div class="[&_p]:m-0 [&_p]:leading-[1.55]">
      <slot />
    </div>
  </aside>
</template>
