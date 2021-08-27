import { reactive, watch } from 'vue';

import DEBUG from './logger';

const storedData = JSON.parse(localStorage.getItem('s3console') || '{}');

const store = reactive(Object.assign({
  delimiter: '/',
  currentBucket: null,
  prefix: '/',
  view_prefix: '/',
  applicationClientId: null,
  applicationLoginUrl: null,
  showSettings: true
}, storedData));

watch(store, () => {
  localStorage.setItem('s3console', JSON.stringify(store));
});

export default store;

export function changeViewPrefix(prefix) {
  DEBUG.log('SharedService::changeViewPrefix');

  if (store.delimiter) {
    // Folder-level view
    store.prefix = prefix;
    store.view_prefix = null;
    // TODO: what was going on here
    // $.fn.dataTableExt.afnFiltering.length = 0;
  } else {
    // Bucket-level view
    store.view_prefix = prefix;
  }
}

export function getViewPrefix() { return store.view_prefix || store.prefix; }

export const s3StorageClasses = {
  STANDARD: 'Standard',
  STANDARD_IA: 'Standard IA',
  ONEZONE_IA: 'One Zone-IA',
  REDUCED_REDUNDANCY: 'Reduced Redundancy',
  GLACIER: 'Glacier',
  INTELLIGENT_TIERING: 'Intelligent Tiering',
  DEEP_ARCHIVE: 'Deep Archive'
};
