/* globals moment */

import { DateTime } from 'luxon';
import { watch, computed } from 'vue';
import DEBUG from './logger';
import store from './store';
import { prefix2folder, fullpath2filename, path2short, isFolder, prefix2parentfolder, fullpath2pathname, bytesToSize } from './converters';

const currentBucket = computed({
  get() {
    return store.currentBucket;
  }
});
watch(currentBucket, () => {
  fetchBucketObjects();
});

export async function fetchBucketObjects() {
  if (!store.currentBucket) {
    return;
  }

  const s3Client = new AWS.S3({ maxRetries: 0, region: store.region });
  const params = {
    Bucket: store.currentBucket,
    Delimiter: store.delimiter,
    Prefix: store.currentDirectory ? (store.currentDirectory !== store.delimiter ? `${store.currentDirectory}/` : store.currentDirectory) : undefined,
    RequestPayer: 'requester'
  };
  let resultList;
  while (params.ContinuationToken || !resultList) {
    const result = await s3Client.listObjectsV2(params).promise();
    resultList = (resultList || []).concat(result.CommonPrefixes.map(object => ({
      key: object.Prefix.slice(0, -1) || store.delimiter,
      type: 'DIRECTORY'
    }))).concat(result.Contents.map(object => ({
      key: object.Key,
      lastModified: DateTime.fromJSDate(new Date(object.LastModified)).toFormat('DD TTT'),
      size: object.Size,
      storageClass: object.StorageClass,
      type: 'PATH'
    })));
    params.ContinuationToken = result.NextContinuationToken;
    store.objects = resultList;
  }
}

export function trashObjects() {
  DEBUG.log('Trash:', store.keys_selected);
  if (store.keys_selected.length > 0) {
    for (let ii = 0; ii < store.keys_selected.length; ii++) {
      const obj = store.keys_selected[ii];
      DEBUG.log('Object to be deleted:', obj);

      const object = path2short(isFolder(obj.Key)
        ? prefix2folder(obj.Key)
        : fullpath2filename(obj.Key));

      const folder = path2short(isFolder(obj.Key)
        ? prefix2parentfolder(obj.Key)
        : fullpath2pathname(obj.Key));

      const lastmodified = isFolder(obj.Key)
        ? ''
        : moment(obj.LastModified).fromNow();

      const timestamp = obj.LastModified
        ? moment(obj.LastModified).local().format('YYYY-MM-DD HH:mm:ss')
        : '';

      const objectclass = isFolder(obj.Key)
        ? ''
        : store.s3StorageClasses[obj.StorageClass];

      const size = isFolder(obj.Key)
        ? ''
        : bytesToSize(obj.Size);

      // Open modal and trash these things
      const trashObject = {
        object,
        folder,
        lastmodified,
        timestamp,
        objectclass,
        size
      };

      // eslint-disable-next-line no-console
      console.error('**** open modal to trash these', trashObject);
    }
  }
}

export async function validateConfiguration(bucket) {
  const s3Client = new AWS.S3({ maxRetries: 0, region: store.region });
  try {
    await s3Client.getBucketCors({ Bucket: bucket }).promise();
  } catch (err) {
    if (err && err.code === 'NetworkingError') {
      throw Error('CORS');
    }
    if (err && err.code === 'AccessDenied') {
      throw Error('PERMISSIONS');
    }
    throw err;
  }
}
