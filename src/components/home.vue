<template>
  <div class="">
    <div class="col-12">
      <div class="panel panel-primary dropzone">

        <!-- Panel including bucket/folder information and controls -->
        <div class="panel-heading" style="display: flex; direction: row; align-items: center; justify-content: space-between">

          <!-- Bucket selection and breadcrumbs -->
          <div style="display: flex; direction: row; align-items: center">
            <!-- Utility name -->
            <div class="title ">AWS S3 Explorer</div>
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
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Object count">{{store.objects.length}} {{ store.objects.length > 1 ? 'objects' : 'object' }}</span>
              </div>
              <!-- Record/checked count -->
              <div class="btn-group" v-if="selectedKeysCount > 0">
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Selected object count">{{ selectedKeysCount }} of {{store.objects.length}} selected</span>
              </div>
            </div>
          </div>

          <!-- Folder/Bucket radio group and progress spinner -->
          <div id="navbuttons">
            <div class="btn-group d-flex">
              <div v-if="store.currentBucket && store.tokens">
                <span style="cursor: pointer;" class="btn fa fa-folder-plus fa-2x" @click="store.showAddFolder = true" title="New folder" />
                <span style="cursor: pointer;" class="btn fa fa-cloud-upload-alt fa-2x" @click="upload()" title="Upload files" />
                
                <span v-if="!selectedKeysCount" style="cursor: pointer;" class="btn fa fa-trash-alt fa-2x" disabled title="Delete objects"/>
                <span v-else style="cursor: pointer;" class="btn fa fa-trash-alt fa-2x" :title="`Delete ${selectedKeysCount} selected object(s)`" @click="store.showTrash = true" />
                <span style="cursor: pointer;" class="btn fa fa-sync fa-2x" @click="refresh()" title="Refresh" />
              </div>
              <span style="cursor: pointer;" class="btn fa fa-sign-out-alt fa-2x" @click="logout()" title="Settings" />
            </div>
          </div>
        </div>

        <!-- Panel including S3 object table -->
        <div class="panel-body">

          <div v-if="store.tokens && store.currentBucket">
            <div>
              <span><a href="#" @click="exploreDirectory(null)">{{ store.currentBucket }}</a>
              </span> / <span v-for="(part, partIndex) in pathParts" :key="part">
                <a :href="`#path=${pathParts.slice(0, partIndex + 1).join(store.delimiter)}`" @click="exploreDirectory(pathParts.slice(0, partIndex + 1).join(store.delimiter))">{{ part }}</a> /
                </span>
            </div>
          </div>

          <br>

          <table class="table table-bordered table-hover table-striped" style="width:100%;" id="s3objects-table">
            <thead>
              <tr>
                <th class="text-center">Select</th>
                <th>Object</th>
                <th>Last Modified</th>
                <th>Class</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="path in sortedObjects.filter(o => o.type === 'DIRECTORY')" :key="path.key">
                <!-- TODO: enable recursive deletes -->
                <!-- <td style="text-align: center; cursor: pointer" @click="() => state.selectedKeys[path.key] = !state.selectedKeys[path.key]">
                  <input type="checkbox" v-model="state.selectedKeys[path.key]">
                </td> -->
                <td></td>
                <td><i class="fas fa-folder" style="margin-right: 1rem" /><a :href="`#path=${path.key}`" @click="exploreDirectory(path.key)">
                  {{ path.key.split(store.delimiter).slice(-1)[0] }}</a>
                </td>
                <td style="text-align: center"></td>
                <td style="text-align: center"></td>
                <td style="text-align: center"></td>
              </tr>
              <tr v-for="path in sortedObjects.filter(o => o.type === 'PATH')" :key="path.key">
                <td style="text-align: center; cursor: pointer" @click="() => state.selectedKeys[path.key] = !state.selectedKeys[path.key]">
                  <input type="checkbox" v-model="state.selectedKeys[path.key]">
                </td>
                <td>{{ path.key.split(store.delimiter).slice(-1)[0] || '(marker)' }}</td>
                <td style="text-align: center">{{ path.lastModified }}</td>
                <td style="text-align: center">{{ path.storageClass }}</td>
                <td style="text-align: center">{{ path.size }}B</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <div class="col-12">
      <SettingsModal v-if="store.showSettings" />
      <BucketSelectorModal v-if="store.showBucketSelector" />
      <AddFolderModal v-if="store.showAddFolder" />
      <TrashModal v-if="store.showTrash" :selectedKeys="Object.keys(state.selectedKeys)" />
    </div>

    <PoweredBy />
  </div>
</template>

<script setup>
import { reactive, onMounted, computed, watch } from 'vue'

import DEBUG from '../logger';
import store from '../store';
import SettingsModal from './settingsModal.vue';
import BucketSelectorModal from './bucketSelectorModal.vue';
import AddFolderModal from './addFolderModal.vue';
import TrashModal from './trashModal.vue';
import PoweredBy from './poweredBy.vue';

import { login } from '../awsUtilities';
import { fetchBucketObjects } from '../bucketManager';

const state = reactive({ objectCount: 0, selectedKeys: {} });

const refresh = async () => {
  try {
    await fetchBucketObjects();
  } catch (error) {
    store.showBucketSelector = true;
  }
};

const logout = () => {
  DEBUG.log('Logging out');
  store.loggedOut = true;
    store.objects = [];

  if (store.tokens) {
    store.tokens = null;
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location = `${store.applicationLoginUrl}/logout?client_id=${store.applicationClientId}&logout_uri=${redirectUri}`;
    return;
  }

  store.showSettings = true;
}

const selectBucket = () => {
  store.showBucketSelector = true;
}

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
      store.showBucketSelector = true;
    }
  }
});

const exploreDirectory = async directory => {
  state.selectedKeys = {};
  store.currentDirectory = directory;
  await fetchBucketObjects();
};

const sortedObjects = computed(() => store.objects.sort((a, b) => a.key.localeCompare(b.key)));
const selectedKeysCount = computed(() => Object.keys(state.selectedKeys).filter(key => !store.deletedObjects[key] && state.selectedKeys[key]).length);
const pathParts = computed(() => store.currentDirectory && store.currentDirectory.split(store.delimiter));

watch(sortedObjects, async (newSortedObjects, previouslySortedObjects) => {
  if (store.currentDirectory && previouslySortedObjects.length && !newSortedObjects.length) {
    await exploreDirectory(store.currentDirectory.split(store.delimiter).slice(0, -1).join(store.delimiter));
  }
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
