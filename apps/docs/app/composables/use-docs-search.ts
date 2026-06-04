export function useDocsSearch() {
  // useState (not a module-level ref) so the open flag is SSR-safe and shared
  // across the header button and the dialog without leaking between requests.
  const open = useState('docs-search-open', () => false);
  function openSearch() {
    open.value = true;
  }
  function closeSearch() {
    open.value = false;
  }
  return { open, openSearch, closeSearch };
}
