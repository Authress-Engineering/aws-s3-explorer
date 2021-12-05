import { DateTime } from 'luxon';
import { watch, computed } from 'vue';
import { saveAs } from 'file-saver';
import JsZip from 'jszip';

import store, { getBuckets } from './store';

const currentBucket = computed({
  get() {
    return store.currentBucket;
  }
});
watch(currentBucket, async () => {
  try {
    await fetchBucketObjects();
  } catch (error) {
    store.objects = [];
  }
});

export async function fetchBucketObjects() {
  try {
    store.objects = await fetchBucketObjectsExplicit(store.currentDirectory);
    // Sometimes the API just refuses to return real results the first time
    if (!store.objects.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      store.objects = await fetchBucketObjectsExplicit(store.currentDirectory);
    }
  } catch (error) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      store.objects = await fetchBucketObjectsExplicit(store.currentDirectory);
      return;
    } catch (innerError) {
      throw error;
    }
  }
}

export async function fetchBucketObjectsExplicit(directory, findAllMatching = false) {
  if (!store.currentBucket) {
    return [];
  }

  const s3client = new AWS.S3({ maxRetries: 0, region: store.region });
  const params = {
    Bucket: store.currentBucket.trim().toLowerCase(),
    Delimiter: findAllMatching ? undefined : store.delimiter,
    Prefix: directory ? (directory !== store.delimiter ? `${directory}/` : directory) : undefined,
    RequestPayer: 'requester'
  };
  let resultList;
  while (params.ContinuationToken || !resultList) {
    const result = await s3client.listObjectsV2(params).promise();
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
  const s3client = new AWS.S3({ maxRetries: 0 });
  try {
    await s3client.getBucketCors({ Bucket: bucket }).promise();
  } catch (err) {
    try {
      await fetchBucketObjectsExplicit();
      return;
    } catch (error) {
      /** Ignore this fallback failure */
    }
    if (err && err.code === 'NetworkingError') {
      throw Error('CORS');
    }
    if (err && err.code === 'AccessDenied') {
      throw Error('PERMISSIONS');
    }
    throw err;
  }
}

export async function downloadObjects(bucket, keys) {
  const s3client = new AWS.S3({ maxRetries: 0, region: getBuckets().find(b => b.bucket === bucket).region || store.region });

  const blobs = [];
  const downloadObject = async key => {
    if (key.slice(-1)[0] === store.delimiter) {
      return;
    }
    const params = { Bucket: bucket, Key: key, RequestPayer: 'requester' };
    const result = await s3client.getObject(params).promise();
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const match = filenameRegex.exec(result.ContentDisposition);
    const filename = match && match[1].replace(/['"]/g, '') || key.split(store.delimiter).slice(-1)[0];
    blobs.push({ blob: new Blob([result.Body]), filename, filepath: key, lastModified: result.LastModified });
  };

  await Promise.all(keys.map(async key => {
    const object = store.objects.find(o => o.key === key);
    if (object.type !== 'DIRECTORY') {
      await downloadObject(key);
    }

    const bucketObjects = await fetchBucketObjectsExplicit(key, true);
    const additionalObjectKeys = bucketObjects.map(b => b.key);
    await Promise.all(additionalObjectKeys.map(additionalKey => downloadObject(additionalKey)));
  }));

  if (blobs.length === 1) {
    saveAs(blobs[0].blob, blobs[0].filename);
    return;
  }

  const archiveAsync = new JsZip();
  blobs.forEach(blob => {
    archiveAsync.file(blob.filepath, blob.blob, { date: blob.lastModified, createFolders: true });
  });
  const archive = await archiveAsync.generateAsync({ type: 'blob' });
  saveAs(archive, `${bucket}-${DateTime.local().toISODate()}.zip`);
}
