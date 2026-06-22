<script setup lang="ts">
import { Button } from '~/components/ui/button';

const { isDark, toggle: toggleTheme } = useThemeToggle();
</script>

<template>
  <Button
    variant="outline"
    size="icon"
    class="bg-surface text-ink-muted hover:text-ink hover:border-ink-muted"
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
  </Button>
</template>
