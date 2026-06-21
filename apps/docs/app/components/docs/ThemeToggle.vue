<script setup lang="ts">
const { isDark, toggle: toggleTheme } = useThemeToggle();
</script>

<template>
  <button
    type="button"
    class="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition-[color,border-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-ink hover:border-ink-muted"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    @click="toggleTheme"
  >
    <ClientOnly>
      <Icon v-if="isDark" name="lucide:sun" class="size-4" />
      <Icon v-else name="lucide:moon" class="size-4" />
      <template #fallback>
        <span class="block size-4" />
      </template>
    </ClientOnly>
  </button>
</template>
