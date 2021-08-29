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
            <div class="" v-if="store.currentBucket" style="margin-right: 0.5rem;">
              <button type="button" class="btn btn-default" @click="selectBucket">{{ store.currentBucket }}</button>
            </div>

            <div v-else>
              <button type="button" class="btn btn-default" @click="selectBucket">Select Bucket</button>
            </div>
                        

            <!-- Record count -->
            <div v-if="store.currentBucket">
              <div class="btn-group" v-if="state.keys_selected.length === 0">
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Object count">{{state.objectCount}}</span>
              </div>
              <!-- Record/checked count -->
              <div class="btn-group" v-if="state.keys_selected.length > 0">
                <span id="badgecount" style="cursor: default;" class="btn badge " title="Selected object count">{{ state.keys_selected.length }} of {{state.objectCount}}</span>
              </div>
            </div>
          </div>

          <!-- Folder/Bucket radio group and progress spinner -->
          <div id="navbuttons" class="">
            <div>
              <!-- Info/Refresh/Settings buttons -->
              <div class="btn-group">
                <span style="cursor: pointer;" class="btn fa fa-folder-plus fa-2x" title="New folder"></span>
                <span style="cursor: pointer;" class="btn fa fa-cloud-upload-alt fa-2x" @click="upload()" title="Upload files"></span>
                <span style="cursor: pointer;" class="btn fa fa-trash-alt fa-2x" :title="`Delete ${state.keys_selected.length} selected object(s)`" :disabled="!state.keys_selected.length" @click="trash()"></span>
                <span v-if="store.currentBucket" style="cursor: pointer;" class="btn fa fa-sync fa-2x" @click="refresh()" title="Refresh"></span>
                <span style="cursor: pointer;" class="btn fa fa-sign-out-alt fa-2x" @click="logout()" title="Settings"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel including S3 object table -->
        <div class="panel-body">
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
              <tr v-for="directory in sortedObjects.filter(o => o.type === 'DIRECTORY')" :key="directory.key">
                <td></td>
                <td><i class="fas fa-folder" /> {{ directory.key }}</td>
                <td style="text-align: center"></td>
                <td style="text-align: center"></td>
                <td style="text-align: center"></td>
              </tr>
              <tr v-for="path in sortedObjects.filter(o => o.type === 'PATH')" :key="path.key">
                <td style="text-align: center">-</td>
                <td>{{ path.key }}</td>
                <td style="text-align: center">{{ o.lastModified }}</td>
                <td style="text-align: center">{{ o.storageClass }}</td>
                <td style="text-align: center">{{ o.size }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <div class="col-12">
      <SettingsModal v-if="store.showSettings" />
      <BucketSelectorModal v-if="store.showBucketSelector" />
      <BucketInfo v-if="store.showBucketInfo" />

    </div>

    <PoweredBy />
  </div>
</template>

<script setup>
import { reactive, onMounted, computed } from 'vue'
import VueTable from "vue3-table-lite";

import store from '../store';
import SettingsModal from './settingsModal.vue';
import BucketSelectorModal from './bucketSelectorModal.vue';
import BucketInfo from './infoModal.vue';
import PoweredBy from './poweredBy.vue';

import { login } from '../awsUtilities';
import { fetchBucketObjects } from '../bucketManager';

defineProps({
  msg: String
});

const state = reactive({ objectCount: 0, keys_selected: [] });

const refresh = () => {
  console.log('*** Refresh');
};

const logout = () => {
  store.tokens = null;
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  window.location = `${store.applicationLoginUrl}/logout?client_id=${store.applicationClientId}&redirect_uri=${redirectUri}&response_type=code`;
  return;
}

const selectBucket = () => {
  store.showBucketSelector = true;
}

const openInfo = () => {
  store.showBucketInfo = false;
  store.showBucketInfo = true;
};

const sortedObjects = computed({
  get: () => {
    return store.objects.sort((a, b) => a.key.localeCompare(b.key));
  }
});

onMounted(async () => {
  if (!store.initialized) {
    await login();
    await fetchBucketObjects();
  }
});
</script>

<style scoped>
a {
  color: #42b983;
}
</style>
