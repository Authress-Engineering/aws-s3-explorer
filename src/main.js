/* ESLint file-level overrides */
/* global AWS */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
/* eslint-disable no-console */
/* eslint no-plusplus: "off" */
/* eslint-env es6 */

import { createApp } from 'vue';
// import AsyncComputed from 'vue-async-computed'

import App from './App.vue';

import './explorer.css';
import './explorer';

// use(AsyncComputed);

createApp(App).mount('#app');

// Default AWS region and v4 signature
AWS.config.update({ region: '' });
AWS.config.update({ signatureVersion: 'v4' });
