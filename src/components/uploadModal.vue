<template>
  <div id="UploadModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" aria-hidden="true" @click="closeUploads">&times;</button>
          <h4 class="modal-title">Upload to: <strong>{{ store.currentDirectory }}</strong></h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <div class="panel-body">
              <p>
              Please confirm that you want to upload the following files to S3:
              </p>
              <table class="table table-bordered table-hover table-striped" id="upload-table">
                <thead id="upload-thead">
                  <tr>
                    <th />
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody id="upload-tbody">
                  <tr v-for="(file, index) in props.filesToUpload" :key="path2short(file.fullPath || file.name)">
                    <td>{{ index + 1 }}</td>
                    <td>{{ path2short(file.fullPath || file.name) }}</td>
                    <td>{{ file.type }}</td>
                    <td>{{ formatByteSize(file.size) }}</td>

                    <td>
                      <div v-if="!state.uploadStarted" />
                      <div v-else-if="typeof state.completionPercentageMap[index] === 'number'" class="progress">
                        <span class="progress-bar" :style="{ width: `${state.completionPercentageMap[index]}%` }">{{ state.completionPercentageMap[index] }}%</span>
                      </div>
                      <div v-else-if="state.completionPercentageMap[index] === 'DENIED'"><span class="progress-bar-danger">Access Denied</span></div>
                      <div v-else-if="state.completionPercentageMap[index] === 'CANCELLED'"><span class="progress-bar-danger" /></div>
                      <div v-else-if="state.completionPercentageMap[index]"><span class="uploadError">{{ state.completionPercentageMap[index] }}</span></div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p>
              The selected files will be uploaded to:<br>
                <strong>{{ store.currentBucket }} > {{ store.currentDirectory || store.delimiter }}</strong>
              </p>
            </div>

            <div v-if="!state.uploadStarted" class="panel panel-success" style="cursor: pointer">
              <div class="panel-heading" style="display: flex; direction: row; align-items: center; justify-content: space-between;">

                <div style="display: flex; direction: row; align-items: center">
                  <div class="title ">Dropzone</div>
                </div>
              </div>

              <div class="panel-body" style="overflow: auto; text-align: center">
                Drag and drop files and folders you want to upload here.
                <br><br>
                <div class="text-muted">
                  <strong>No files or folders</strong><br>
                  You have not chosen any files or folders to upload.
                </div>

              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button :disabled="state.status === 'IN_PROGRESS'" type="button" class="btn btn-default" @click="closeUploads">Close</button>
              <button v-if="uploadButtonText" type="button" class="btn btn-primary" @click="uploadClicked"><i class="fa fa-cloud-upload-alt fa-lg" /> {{ uploadButtonText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue';

import { path2short, formatByteSize } from '../converters';
import DEBUG from '../logger';
import store from '../store';

const props = defineProps({ filesToUpload: Array });
const emit = defineEmits(['uploadsCompleted']);

const state = reactive({ uploadStarted: false, completionPercentageMap: {} });
let uploadHandlerMap = {};

const allUploadsCompleted = computed(() => state.uploadStarted && Object.values(state.completionPercentageMap).every(v => v === 100));
const status = computed(() => {
  if (!state.uploadStarted) { return 'WAITING_FOR_APPROVAL'; }
  if (allUploadsCompleted) { return 'FINISHED'; }
  return 'IN_PROGRESS';
});

const uploadButtonText = computed(() => {
  return {
    WAITING_FOR_APPROVAL: props.filesToUpload?.length === 1 ? 'Upload 1 file' : `Upload ${props.filesToUpload?.length} files`,
    IN_PROGRESS: 'Cancel remaining uploads'
  }[status.value];
});

const uploadClicked = () => {
  if (!state.uploadStarted) {
    // eslint-disable-next-line no-use-before-define
    uploadFiles();
    return;
  }

  Object.keys(uploadHandlerMap).forEach(fileIndex => {
    if (typeof state.completionPercentageMap[fileIndex] === 'number' && state.completionPercentageMap[fileIndex] < 100) {
      uploadHandlerMap[fileIndex].abort();
    }
  });
};

const closeUploads = () => {
  emit('uploadsCompleted');
  store.showUploads = false;
};

const uploadFiles = () => {
  uploadHandlerMap = {};
  state.uploadStarted = true;

  props.filesToUpload.forEach((file, fileIndex) => {
    DEBUG.log('Uploading file:', file);

    const s3client = new AWS.S3({ region: store.region });
    const params = {
      Bucket: store.currentBucket.trim().toLowerCase(),
      Key: (store.currentDirectory && `${store.currentDirectory}${store.delimiter}` || '') + (file.fullPath || file.name),
      ContentType: file.type, Body: file
    };
    const uploadEventBus = s3client.upload(params);
    uploadHandlerMap[fileIndex] = uploadEventBus;

    state.completionPercentageMap[fileIndex] = 0;

    const progressUpdatedHandler = evt => {
      DEBUG.log('File:', file, 'Part:', evt.part, evt.loaded, 'of', evt.total);
      if (typeof evt.loaded == "number" && typeof evt.total == "number"){
        // Use evt.loaded and evt.total to calculate the percentage of data uploaded
        state.completionPercentageMap[fileIndex] = Math.round((evt.loaded * 100) / evt.total);
      }
    };

    const startUploadHandler = err => {
      if (err) {
        // AccessDenied is a normal consequence of lack of permission
        // and we do not treat this as completely unexpected
        if (err.code === 'AccessDenied') {
          DEBUG.log('Access Denied for upload:', file);
          state.completionPercentageMap[fileIndex] = 'DENIED';
        } else if (err.code === 'RequestAbortedError') {
          DEBUG.log('Abort upload:', file);
          state.completionPercentageMap[fileIndex] = 'CANCELLED';
        } else {
          DEBUG.log(JSON.stringify(err));
          state.completionPercentageMap[fileIndex] = `FAILED: ${err.code}`;
        }
      } else {
        DEBUG.log('Uploaded', file.name);
        state.completionPercentageMap[fileIndex] = 100;
      }
    };

    uploadEventBus.on('httpUploadProgress', progressUpdatedHandler).send(startUploadHandler);
  });
};

</script>

<style lang="scss" scoped>
.progress-bar-danger {
  width: 100%;
}

.progress-bar {
  min-width: 25px;
  width: 0%;
}

.uploadError {
  color: #AF0000;
}
</style>
