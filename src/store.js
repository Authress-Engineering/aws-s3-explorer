import { reactive, watch } from 'vue';

import DEBUG from './logger';

const storedData = JSON.parse(localStorage.getItem('s3console') || '{}');

const store = reactive(Object.assign({
  region: null,

  delimiter: '/',
  currentBucket: null,
  rememberedBuckets: [],
  currentDirectory: null,
  applicationClientId: null,
  applicationLoginUrl: null,
  identityPoolId: null,
  objects: [],

  showSettings: false,
  showBucketInfo: false,
  showBucketSelector: false
}, storedData, {
  initialized: false,
  showBucketSelector: false,
  showBucketInfo: false
}));

watch(store, () => {
  localStorage.setItem('s3console', JSON.stringify(store));
  AWS.config.update({ region: store.region });
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
