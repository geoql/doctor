<script setup lang="ts">
import { Comment, computed, useSlots } from 'vue';

const activeTab = ref(0);
const slots = useSlots();

const tabs = computed(() => {
  const defaultSlot = slots.default?.();
  if (!defaultSlot) return [];
  return defaultSlot
    .filter((node) => node.type !== Comment)
    .map((node, index) => {
      const props = (node.props ?? {}) as Record<string, string>;
      return {
        index,
        label: props.filename ?? props.language ?? `Tab ${index + 1}`,
        node,
      };
    });
});
</script>

<template>
  <div class="my-6 overflow-hidden rounded-lg border border-border">
    <div
      v-if="tabs.length > 1"
      class="flex border-b border-border bg-surface-2"
    >
      <button
        v-for="tab in tabs"
        :key="tab.index"
        :class="[
          'px-4 py-2 font-mono text-xs transition-colors duration-120',
          activeTab === tab.index
            ? 'border-b-2 border-accent text-ink'
            : 'text-ink-muted hover:text-ink',
        ]"
        type="button"
        @click="activeTab = tab.index"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="[&_pre]:my-0 [&_pre]:border-0">
      <template v-for="(tab, i) in tabs" :key="i">
        <div v-show="activeTab === i">
          <component :is="tab.node" />
        </div>
      </template>
    </div>
  </div>
</template>
