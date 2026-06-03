<script setup lang="ts">
import {
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  XCircle,
} from 'lucide-vue-next';
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
}

const config = computed<AlertConfig>(() => {
  switch (props.type) {
    case 'warning':
      return {
        icon: AlertTriangle,
        label: 'Warning',
        labelColor: 'text-warn',
      };
    case 'tip':
      return { icon: Lightbulb, label: 'Tip', labelColor: 'text-ok' };
    case 'success':
      return { icon: CheckCircle, label: 'Success', labelColor: 'text-ok' };
    case 'error':
      return { icon: XCircle, label: 'Error', labelColor: 'text-error' };
    default:
      return { icon: Info, label: 'Info', labelColor: 'text-info' };
  }
});
</script>

<template>
  <aside
    class="my-6 border-l-2 border-l-info bg-[color-mix(in_oklch,var(--info)_7%,var(--surface))] p-4"
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
    <div class="text-sm leading-relaxed text-ink-muted [&_p]:mb-0">
      <slot />
    </div>
  </aside>
</template>
