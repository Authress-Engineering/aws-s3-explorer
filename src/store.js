import { reactive } from 'vue';

import DEBUG from './logger';

const store = reactive({
  delimiter: '/',
  currentBucket: null,
  prefix: '/',
  view_prefix: '/'
});

export default store;

export function changeViewPrefix(prefix) {
  DEBUG.log('SharedService::changeViewPrefix');

  if (store.delimiter) {
    // Folder-level view
    store.prefix = prefix;
    store.view_prefix = null;
    $.fn.dataTableExt.afnFiltering.length = 0;
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
  DEEP_ARCHIVE: 'Deep Archive',
};
