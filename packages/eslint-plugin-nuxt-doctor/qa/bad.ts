const title = document.title;
const data = await $fetch('/api');
const u = useState('u', () => $fetch('/api/users'));
