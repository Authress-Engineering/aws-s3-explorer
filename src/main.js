// https://v3.vuejs.org/api/application-api.html
import { createApp } from 'vue';
import VueClipboard from 'vue3-clipboard';

import './explorer.css';

import App from './App.vue';
const app = createApp(App);

// https://github.com/FortAwesome/vue-fontawesome
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
// import { library, dom } from '@fortawesome/fontawesome-svg-core';
// dom.watch();
// import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
// library.add(faSpinner);
// app.component('Fa', FontAwesomeIcon);

app.use(VueClipboard, { autoSetContainer: true, appendToBody: true });

// Default AWS region and v4 signature
AWS.config.update({ region: '' });
AWS.config.update({ signatureVersion: 'v4' });

app.mount('#app');
