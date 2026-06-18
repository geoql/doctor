<script setup lang="ts">
import {
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  XCircle,
} from '@lucide/vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    type?: 'info' | 'warning' | 'tip' | 'success' | 'error';
  }>(),
  { type: 'info' },
);

interface AlertConfig {
  icon: typeof Info;
  label: string;
  labelColor: string;
  tint: string;
}

const config = computed<AlertConfig>(() => {
  switch (props.type) {
    case 'warning':
      return {
        icon: AlertTriangle,
        label: 'Warning',
        labelColor: 'text-warn',
        tint: 'var(--warn)',
      };
    case 'tip':
      return {
        icon: Lightbulb,
        label: 'Tip',
        labelColor: 'text-ok',
        tint: 'var(--ok)',
      };
    case 'success':
      return {
        icon: CheckCircle,
        label: 'Success',
        labelColor: 'text-ok',
        tint: 'var(--ok)',
      };
    case 'error':
      return {
        icon: XCircle,
        label: 'Error',
        labelColor: 'text-error',
        tint: 'var(--error)',
      };
    default:
      return {
        icon: Info,
        label: 'Info',
        labelColor: 'text-info',
        tint: 'var(--info)',
      };
  }
});
</script>

<template>
  <aside
    class="my-6 rounded-lg border p-4"
    :style="{
      borderColor: `color-mix(in oklch, ${config.tint} 30%, var(--border))`,
      background: `color-mix(in oklch, ${config.tint} 7%, var(--surface))`,
    }"
  >
    <div class="mb-1 flex items-center gap-2">
      <component :is="config.icon" :class="['size-4', config.labelColor]" />
      <span
        :class="[
          'font-mono text-xs font-medium uppercase tracking-wider',
          config.labelColor,
        ]"
      >
        {{ config.label }}
      </span>
    </div>
    <div class="text-sm/relaxed text-ink-muted [&_p]:mb-0">
      <slot />
    </div>
  </aside>
</template>
