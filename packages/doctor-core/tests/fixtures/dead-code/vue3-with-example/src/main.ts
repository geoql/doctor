import { createApp } from 'vue';
import App from './App.vue';
import { greet } from './utils/used.js';

createApp(App).mount('#app');
greet('world');
