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
  store.objects = await fetchBucketObjectsExplicit(store.currentDirectory);
}

export async function fetchBucketObjectsExplicit(directory) {
  if (!store.currentBucket) {
    return [];
  }

  const s3Client = new AWS.S3({ maxRetries: 0, region: store.region });
  const params = {
    Bucket: store.currentBucket,
    Delimiter: store.delimiter,
    Prefix: directory ? (directory !== store.delimiter ? `${directory}/` : directory) : undefined,
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
  }
  return resultList;
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
