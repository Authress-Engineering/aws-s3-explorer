<template>
  <DropzoneWrapper @fileAdded="fileAdded">
    <div class="col-12" style="display: flex; flex-direction: column; flex-wrap: nowrap;">
      <div class="panel panel-primary" style="flex-grow: 1">

        <!-- Panel including bucket/folder information and controls -->
        <div class="panel-heading" style="display: flex; direction: row; align-items: center; justify-content: space-between;">

          <!-- Bucket selection and breadcrumbs -->
          <div style="display: flex; direction: row; align-items: center">
            <div class="title d-flex" style="align-items: center">
              <div style="height: 30px; width: 30px; background: white; border-radius: 5px; margin-right: 1rem">
                <img src="../assets/bucket-logo-focused.png" height="30">
              </div>
              <h4>AWS S3 Explorer</h4>
            </div>
            <!-- Bucket breadcrumbs -->
            <div class="" v-if="store.tokens && store.currentBucket" style="margin-right: 0.5rem;">
              <button type="button" class="btn btn-default" @click="selectBucket">{{ store.currentBucket }}</button>
            </div>

            <div v-else-if="store.tokens">
              <button type="button" class="btn btn-default" @click="selectBucket">Select Bucket</button>
            </div>

            <!-- Record count -->
            <div v-if="store.tokens && store.currentBucket">
              <div class="btn-group" v-if="selectedKeysCount === 0">
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Object count">{{ store.objects.length }} {{ store.objects.length > 1 ? 'objects' : 'object' }}</span>
              </div>
              <!-- Record/checked count -->
              <div class="btn-group" v-if="selectedKeysCount > 0">
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Selected object count">{{ selectedKeysCount }} of {{ store.objects.length }} selected</span>
              </div>
            </div>
          </div>

          <!-- Folder/Bucket radio group and progress spinner -->
          <div id="navbuttons">
            <div class="btn-group d-flex">
              <div v-if="store.currentBucket && store.tokens">
                <span style="cursor: pointer;" class="btn fa fa-sync fa-2x" :class="{ 'fa-spin': state.loading }" @click="refresh()" title="Reload the directory" />
              </div>
              <span style="cursor: pointer;" class="btn fa fa-sign-out-alt fa-2x" @click="logout()" title="Logout" />
              <span style="cursor: pointer;" class="btn fa" @click="openGithub()" title="Check out the source at Github.com"><img src="../assets/github-logo.svg" height="28"></span>
            </div>
          </div>
        </div>

        <!-- Panel including S3 object table -->
        <div class="panel-body" style="overflow: auto">

          <div v-if="store.tokens && store.currentBucket" style="display: flex; align-items: center; justify-content: space-between">
            <div>
              <span><a href="#" @click="exploreDirectory(null)">{{ store.currentBucket }}</a></span>&nbsp;/&nbsp;
              <span v-for="(part, partIndex) in pathParts" :key="part">
                <a :style="{ 'text-decoration': partIndex + 1 === pathParts.length ? 'none' : undefined, color: partIndex + 1 === pathParts.length ? 'unset' : undefined, cursor: partIndex + 1 === pathParts.length ? 'unset' : 'pointer' }"
                  :href="`#path=${pathParts.slice(0, partIndex + 1).join(store.delimiter)}`" @click="exploreDirectory(pathParts.slice(0, partIndex + 1).join(store.delimiter))">
                  {{ part.length > 30 ? `${part.slice(0, 30)}…` : part }}
                </a>&nbsp;/&nbsp;
              </span>
            </div>
            <div style="flex-shrink: 0; flex-grow: 1; display: flex; flex-direction: row; flex-wrap: no-wrap; justify-content: flex-end">
              <button type="button" style="cursor: pointer; margin-left: 0.5rem" class="text-primary btn btn-xs btn-warning" :disabled="!selectedKeysCount" @click="downloadFiles" title="Download files">
                <i class="fa fa-cloud-download-alt" style="margin-right: 0.5rem" />Download
              </button>
              <button type="button" style="cursor: pointer; margin-left: 0.5rem" class="text-primary btn btn-xs btn-primary" @click="store.showAddFolder = true" title="New folder">
                <i class="fa fa-folder-plus" style="margin-right: 0.5rem" />New Folder
              </button>
              <button type="button" style="cursor: pointer; margin-left: 0.5rem" class="text-primary btn btn-xs btn-danger" :disabled="!selectedKeysCount" @click="store.showTrash = true" title="Delete Objects">
                <i class="fa fa-trash-alt" style="margin-right: 0.5rem" />Delete Objects
              </button>
            </div>
          </div>

          <br>

          <table v-if="store.tokens" class="table table-bordered table-hover table-striped" style="width:100%;" id="s3objects-table">
            <thead>
              <tr>
                <th class="text-center" style="text-align: center; cursor: pointer" @click="state.globalSelect = !state.globalSelect">
                  <input type="checkbox" v-model="state.globalSelect">
                </th>
                <th>Object</th>
                <th>Last Modified</th>
                <th>Class</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="path in sortedObjects.filter(o => o.type === 'DIRECTORY')" :key="path.key">
                <td style="text-align: center; cursor: pointer" @click="() => state.selectedKeys[path.key] = !state.selectedKeys[path.key]">
                  <input type="checkbox" v-model="state.selectedKeys[path.key]">
                </td>
                <td><i class="fas fa-folder" style="margin-right: 1rem" /><a :href="`#path=${path.key}`" @click="exploreDirectory(path.key)">
                  {{ path.key.split(store.delimiter).slice(-1)[0] || store.delimiter }}</a>
                </td>
                <td style="text-align: center" />
                <td style="text-align: center" />
                <td style="text-align: center" />
              </tr>
              <tr v-for="path in sortedObjects.filter(o => o.type === 'PATH' && o.key.split(store.delimiter).slice(-1)[0])" :key="path.key">
                <td style="text-align: center; cursor: pointer" @click="() => state.selectedKeys[path.key] = !state.selectedKeys[path.key]">
                  <input type="checkbox" v-model="state.selectedKeys[path.key]">
                </td>
                <td>{{ path.key.split(store.delimiter).slice(-1)[0] }}</td>
                <td style="text-align: center">{{ path.lastModified }}</td>
                <td style="text-align: center">{{ path.storageClass }}</td>
                <td style="text-align: center">{{ formatByteSize(path.size) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <div class="panel panel-success" v-if="store.tokens && store.currentBucket" @click="store.showUploads = true" style="cursor: pointer">
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

    <div class="col-12">
      <SettingsModal v-if="store.showSettings" />
      <BucketSelectorModal v-if="store.showBucketSelector" />
      <AddFolderModal v-if="store.showAddFolder" />
      <TrashModal v-if="store.showTrash" :selectedKeys="Object.keys(state.selectedKeys).filter(k => state.selectedKeys[k])" @trashCompleted="uploadsCompleted" />
      <UploadModal v-if="store.showUploads" :filesToUpload="state.filesToUpload" @uploadsCompleted="uploadsCompleted" />
    </div>

    <PoweredBy />
  </DropzoneWrapper>
</template>

<script setup>
import { reactive, onMounted, computed, watch } from 'vue';

import DEBUG from '../logger';
import store from '../store';
import SettingsModal from './settingsModal.vue';
import BucketSelectorModal from './bucketSelectorModal.vue';
import AddFolderModal from './addFolderModal.vue';
import TrashModal from './trashModal.vue';
import UploadModal from './uploadModal.vue';
import PoweredBy from './poweredBy.vue';
import DropzoneWrapper from './dropzoneWrapper.vue';

import { login } from '../awsUtilities';
import { formatByteSize } from '../converters';
import { fetchBucketObjects, downloadObjects } from '../bucketManager';

const state = reactive({ objectCount: 0, selectedKeys: {}, filesToUpload: [], globalSelect: false });

const refresh = async () => {
  const spinnerAsync = new Promise(resolve => setTimeout(resolve, 1000));
  try {
    state.loading = true;
    await fetchBucketObjects();
  } catch (error) {
    store.showBucketSelector = true;
  }
  await spinnerAsync;
  state.loading = false;
};

const logout = () => {
  DEBUG.log('Logging out');
  store.objects = [];
  store.loggedOut = true;

  if (store.tokens) {
    store.tokens = null;
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location = `${store.applicationLoginUrl}/logout?client_id=${store.applicationClientId}&logout_uri=${redirectUri}`;
    return;
  }

  store.showSettings = true;
};

const selectBucket = () => {
  store.showBucketSelector = true;
};

onMounted(async () => {
  if (store.loggedOut) {
    store.showSettings = true;
    return;
  }

  if (!store.initialized) {
    await login();

    try {
      await fetchBucketObjects();
    } catch (error) {
      DEBUG.log('Fetching Bucket Objects Error: ', error);
    }

    if (!store.rememberedBuckets.length && !store.showSettings) {
      store.showBucketSelector = true;
    }
  }
});

const fileAdded = file => {
  state.filesToUpload.push(file);
  store.showUploads = true;
};

const uploadsCompleted = () => {
  state.filesToUpload = [];
  state.selectedKeys = {};
  fetchBucketObjects();
};

const exploreDirectory = async directory => {
  state.selectedKeys = {};
  state.globalSelect = false;
  store.currentDirectory = directory;
  await fetchBucketObjects();
};

const downloadFiles = async () => {
  await downloadObjects(store.currentBucket, Object.keys(state.selectedKeys));
};

const sortedObjects = computed(() => store.objects.sort((a, b) => a.key.localeCompare(b.key)));
const selectedKeysCount = computed(() => Object.keys(state.selectedKeys).filter(key => !store.deletedObjects[key] && state.selectedKeys[key]).length);

const pathParts = computed(() => {
  if (store.currentDirectory === store.delimiter) {
    return [store.currentDirectory];
  }
  return store.currentDirectory && store.currentDirectory.split(store.delimiter) || [];
});

const openGithub = () => { window.open('https://github.com/Rhosys/aws-s3-explorer#aws-s3-explorer', '_blank'); };

watch(sortedObjects, async (newSortedObjects, previouslySortedObjects) => {
  if (store.currentDirectory && previouslySortedObjects.length && !newSortedObjects.length) {
    await exploreDirectory(store.currentDirectory.split(store.delimiter).slice(0, -1).join(store.delimiter));
  }
});

const globalSelectWatcher = computed(() => state.globalSelect);

watch(globalSelectWatcher, newValue => {
  sortedObjects.value.forEach(o => {
    state.selectedKeys[o.key] = newValue;
  });
});
</script>

<style lang="scss" scoped>
a {
  color: #2e6da4;
}

.d-flex {
  display: flex;
  width: 100%;

  .align-items-center {
    align-items: center;
  }
  .justify-content-center {
    justify-content: space-around;
  }
}

</style>
