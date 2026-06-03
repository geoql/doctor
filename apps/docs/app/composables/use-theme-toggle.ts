/**
 * Theme Toggle Composable
 *
 * Dark/light mode toggle using @nuxtjs/color-mode.
 * The `classSuffix: ''` setting in nuxt.config makes the color-mode
 * attribute live on the <html> element (not `html.dark`/`html.light`).
 * Default preference is dark; falls back to dark on the server.
 */
export function useThemeToggle() {
  const colorMode = useColorMode();

  const isDark = computed(() => colorMode.value === 'dark');

  function toggle() {
    colorMode.preference = isDark.value ? 'light' : 'dark';
  }

  return { colorMode, isDark, toggle };
}
