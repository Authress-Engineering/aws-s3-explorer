import { createApp } from 'vue';

import App from './App.vue';

import './explorer.css';
import './explorer';

// use(AsyncComputed);

createApp(App).mount('#app');

// Default AWS region and v4 signature
AWS.config.update({ region: '' });
AWS.config.update({ signatureVersion: 'v4' });
