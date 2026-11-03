export const useSessionStore = defineStore('session', () => {
  const name = ref('guest');
  return { name };
});
