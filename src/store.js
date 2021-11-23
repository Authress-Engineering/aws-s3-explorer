import { reactive, watch, computed } from 'vue';

const storedData = JSON.parse(localStorage.getItem('s3console') || '{}');

const store = reactive(Object.assign({
  region: null,

  delimiter: '/',
  currentBucket: null,
  rememberedBuckets: [],
  currentDirectory: null,

  awsAccountId: null,
  cognitoPoolId: null,
  applicationClientId: null,
  applicationLoginUrl: null,
  identityPoolId: null,
  userRoleId: null,

  objects: [],

  loggedOut: false,
  autoLoginIn: false
}, storedData, {
  initialized: false,
  globalLoader: true,
  loggedOut: false,
  showBucketSelector: false,
  showSettings: false,
  showAddFolder: false,
  showTrash: false,
  showUploads: false,
  deletedObjects: {}
}));

watch(store, () => {
  localStorage.setItem('s3console', JSON.stringify(store));
  AWS.config.update({ region: store.region });
});

const currentBucket = computed(() => store.currentBucket);
watch(currentBucket, () => {
  store.deletedObjects = {};
});

export default store;

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
