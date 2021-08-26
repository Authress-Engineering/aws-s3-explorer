<template>
  <div class="row">
    <div class="col-lg-12">
      <div class="panel panel-primary dropzone">

        <!-- Panel including bucket/folder information and controls -->
        <div class="panel-heading clearfix">

          <!-- Bucket selection and breadcrumbs -->
          <div class="btn-group pull-left">
            <!-- Utility name -->
            <div class="title pull-left">AWS S3 Explorer</div>
            <!-- Bucket breadcrumbs -->
            <div class="pull-right">
              <ul id="breadcrumb" class="breadcrumb pull-right">
                <li class="active">
                  <a href="#">&lt;bucket&gt;</a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Folder/Bucket radio group and progress spinner -->
          <div id="navbuttons" class="pull-right hidden">
            <div>
              <!-- Info/Refresh/Settings buttons -->
              <div class="btn-group">
                <span id="bucket-plus" style="cursor: pointer;" class="btn fa fa-folder-plus fa-2x" title="New folder" data-target="#AddFolderModal" data-toggle="modal"></span>
                <span id="bucket-upload" style="cursor: pointer;" class="btn fa fa-cloud-upload-alt fa-2x" @click="upload()" title="Upload files"></span>
                <span id="bucket-trash" style="cursor: pointer;" class="btn fa fa-trash-alt fa-2x" title="Delete {{state.keys_selected.length}} selected object(s)" :disabled="!state.keys_selected.length" @click="trash()"></span>
                <span id="bucket-info" style="cursor: pointer;" class="btn fa fa-info-circle fa-2x" title="Info" data-target="#InfoModal" data-toggle="modal"></span>
                <span id="bucket-loader" style="cursor: pointer;" class="btn fa fa-sync fa-2x" @click="refresh()" title="Refresh"></span>
                <span id="bucket-settings" style="cursor: pointer;" class="btn fa fa-cog fa-2x" title="Settings" data-target="#SettingsModal" data-toggle="modal"></span>
              </div>
              <!-- Record count -->
              <div class="btn-group" v-if="state.keys_selected.length === 0">
                <span id="badgecount" style="cursor: default;" class="btn badge pull-right" title="Object count">{{state.objectCount}}</span>
              </div>
              <!-- Record/checked count -->
              <div class="btn-group" v-if="state.keys_selected.length > 0">
                <span id="badgecount" style="cursor: default;" class="btn badge pull-right" title="Selected object count">{{ state.keys_selected.length }} of {{state.objectCount}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel including S3 object table -->
        <div class="panel-body">
          <table class="table table-bordered table-hover table-striped" style="width:100%" id="s3objects-table">
            <thead>
              <tr>
                <th class="text-center">Select</th>
                <th>Object</th>
                <th>Folder</th>
                <th>Last Modified</th>
                <th>Timestamp</th>
                <th>Class</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody id="s3objects-tbody"></tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, reactive, onMounted } from 'vue'

defineProps({
  msg: String
});

const state = reactive({ objectCount: 0, keys_selected: [], settings: {} });
onMounted(() => {
  console.log('****');
});

const refresh = () => {
  console.log('*** Refresh');
};
</script>

<style scoped>
a {
  color: #42b983;
}
</style>
