const open = ref(false);

export function useDocsSearch() {
  function openSearch() {
    open.value = true;
  }
  function closeSearch() {
    open.value = false;
  }
  return { open, openSearch, closeSearch };
}
