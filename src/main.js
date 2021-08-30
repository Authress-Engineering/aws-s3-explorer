// https://v3.vuejs.org/api/application-api.html
import { createApp } from 'vue';
import VueClipboard from 'vue3-clipboard';

import App from './App.vue';

import './explorer.css';

// use(AsyncComputed);

const app = createApp(App);

app.use(VueClipboard, { autoSetContainer: true, appendToBody: true });

// Default AWS region and v4 signature
AWS.config.update({ region: '' });
AWS.config.update({ signatureVersion: 'v4' });

app.mount('#app');
