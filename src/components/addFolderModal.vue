<template>
  <div id="AddFolderModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <form @submit.prevent="addFolder();">
          <div>
            <div class="modal-header">
              <button type="button" class="close" @click="store.showAddFolder = false" aria-hidden="true">&times;</button>
              <h4 class="modal-title">S3 Explorer: Create New Folder</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <div class="panel panel-default">
                  <div class="panel-body">
                    <p>Please enter the relative path of the S3 folder to add to the current directory of the selected bucket, for example folder01 or Lorem/Ipsum/Bacon.</p>
                    <span>Current Bucket: <strong>{{store.currentBucket}}</strong></span><br><br>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">{{store.currentDirectory || '(root)' }}</span>
                      <input name="folder" v-model="state.newFolderName" type="text" class="form-control" placeholder="folder" required="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <div class="form-group">
                <div class="col-sm-offset-2 col-sm-10">
                  <button type="button" class="btn btn-default" @click="store.showAddFolder = false">Cancel</button>
                  <button type="submit" :disabled="!state.newFolderName" class="btn btn-primary"><i class='fa fa-folder-plus fa-lg'></i>&nbsp;Add Folder</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

import DEBUG from '../logger';
import store from '../store';
import { stripLeadTrailSlash } from '../converters';
  
const state = reactive({ newFolderName: null });

const addFolder = async () => {
  DEBUG.log('Adding new directory');

  const sanitizedFolderName = state.newFolderName.trim();

  const ef = stripLeadTrailSlash(sanitizedFolderName);
  const vpef = `${store.currentDirectory || ''}${store.delimiter}${ef}`;
  const folder = stripLeadTrailSlash(vpef);
  DEBUG.log('Calculated directory:', folder);

  if (store.objects.find(o => o.key === folder && o.type === 'DIRECTORY')) {
    bootbox.alert(`Error: folder or object already exists at: ${folder}`);
    return;
  }

  const s3client = new AWS.S3(AWS.config);
  const params = { Bucket: store.currentBucket, Key: `${folder}${store.delimiter}` };

  // Test if an object with this key already exists
  try {
    await s3client.headObject(params).promise();
    DEBUG.log('Directory already exists, skipping creation');
  } catch (err1) {
    if (!err1) {
      bootbox.alert(`Error: directory or object already exists at: ${folder}`);
      return;
    }

    if (err1 && err1.code !== 'NotFound') {
      bootbox.alert(`Error checking existence of folder: ${err1}`);
      return;
    }

    // If the folder doesn't exist, then we can create a marker to make it exist
    try {
      await s3client.putObject(params).promise();
    } catch (err2) {
      DEBUG.log('putObject error:', err2);
      bootbox.alert(`Error creating folder: ${err2}`);
      return;
    }
  }

  store.objects.push({ key: `${store.currentDirectory}${store.delimiter}${sanitizedFolderName.split(store.delimiter)[0]}`, type: 'DIRECTORY' });
  store.showAddFolder = false;
};
</script>