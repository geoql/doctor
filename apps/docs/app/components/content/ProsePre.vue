<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next';

const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
  highlights?: number[];
}>();

const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

async function copyText() {
  if (!props.code) return;
  try {
    await navigator.clipboard.writeText(props.code);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = props.code;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* clipboard not available */
    }
    document.body.removeChild(ta);
  }
  copied.value = true;
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    copied.value = false;
  }, 1400);
}
</script>

<template>
  <div class="my-6 overflow-hidden rounded-lg border border-border bg-surface">
    <div
      v-if="filename || language"
      class="flex items-center gap-2.5 border-b border-border-soft bg-surface-2 px-3 py-2"
    >
      <div class="flex items-center gap-1.5" aria-hidden="true">
        <span class="block size-2 rounded-full bg-error" />
        <span class="block size-2 rounded-full bg-warn" />
        <span class="block size-2 rounded-full bg-info" />
      </div>
      <span class="font-mono text-xs text-ink-muted">{{
        filename ?? language
      }}</span>
      <span class="grow" />
      <button
        v-if="code"
        type="button"
        :class="[
          'inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11.5px] transition-[color,background] duration-120',
          copied ? 'text-ok' : 'text-ink-muted hover:text-ink hover:bg-surface',
        ]"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        @click="copyText"
      >
        <component :is="copied ? Check : Copy" class="size-3" />
        <span>{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>
    <button
      v-else-if="code"
      type="button"
      class="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded bg-surface-2 px-2 py-1 font-mono text-[11.5px] text-ink-muted transition-[color,background] duration-120 hover:text-ink"
      :class="copied ? 'text-ok' : ''"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copyText"
    >
      <component :is="copied ? Check : Copy" class="size-3" />
      <span>{{ copied ? 'Copied' : 'Copy' }}</span>
    </button>
    <pre :class="$attrs.class"><slot /></pre>
  </div>
</template>
