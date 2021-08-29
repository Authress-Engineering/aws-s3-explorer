<template>
  <div id="TrashModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" @click="closeModal">&times;</button>
          <h4 class="modal-title">S3 Explorer: Delete {{trash.count}} objects</h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <div class="panel-body">
              <p>
              Please confirm that you want to delete the following objects from S3.
              <br>
              <span>Current Bucket: <strong>{{store.currentBucket}}</strong></span><br><br>
              </p>
              <table class="table table-bordered table-hover table-striped" id="trash-table">
                <thead id="trash-thead">
                  <tr>
                    <th></th>
                    <th>Object</th>
                    <th>Last Modified</th>
                    <th>Class</th>
                    <th>Size</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody id="trash-tbody">
                  <tr v-for="(o, index) in objects" :key="o.key">
                    <td>{{index + 1}}</td>
                    <td>{{o.key}}</td>
                    <td>{{o.lastModified}}</td>
                    <td>{{o.class}}</td>
                    <td>{{o.size}}B</td>
                    <td>
                      <span v-if="trash.objectStatus[o.key] === 'DENIED'" class="trasherror">Access Denied</span>
                      <span v-else-if="trash.objectStatus[o.key] === 'DELETED'" class="trashdeleted">Deleted</span>
                      <span v-else-if="trash.objectStatus[o.key]" class="trasherror">{{ trash.objectStatus[o.key] }}</span>
                      <i v-else>n/a</i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button type="button" class="btn btn-default" @click="closeModal">{{ objectsRemaining ? 'Cancel' : 'Close' }}</button>
              
              <button v-if="trash.trashing || objectsRemaining" type="button" class="btn btn-danger" @click="deleteFiles(props.selectedKeys)" :disabled="trash.trashing">
                <i class="fa fa-trash-alt fa-lg"></i> {{ deleteButtonText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, computed } from 'vue'
import DEBUG from '../logger';
import { path2short, isFolder } from '../converters';
import store from '../store';

const trash = reactive({ title: null, trashing: false, objectStatus: {} });

const props = defineProps({
  selectedKeys: Array
});

onMounted(() => {
  store.deletedObjects = {};
}); 

const objects = computed(() => {
  const keyMap = props.selectedKeys?.reduce((acc, key) => { acc[key] = true; return acc; }, {});
  return store.objects.filter(o => keyMap[o.key]).sort((a, b) => a.key.localeCompare(b.key));
});

const closeModal = () => {
  store.objects = store.objects.filter(o => !store.deletedObjects[o.key]);
  store.showTrash = false;
}
const deleteFiles = async (keys, recursion) => {
  DEBUG.log('Delete file count:', keys.length);
  trash.trashing = true;

  const s3client = new AWS.S3({ region: store.region });
  await Promise.all(keys.map(async key => {
    if (trash.objectStatus[key] === 'DELETED') {
      return;
    }

    DEBUG.log('Deleting key:', key);
    try {
      await s3client.deleteObject({ Bucket: store.currentBucket, Key: key }).promise();
      trash.objectStatus[key] = 'DELETED';
      store.deletedObjects[key] = true;
      DEBUG.log('DELETED:', key);
    } catch (error) {
      DEBUG.log(`Failed to delete: ${key} - ${error}`);
      if (error.code === 'AccessDenied') {
        trash.objectStatus[key] = 'DENIED';
      } else {
        trash.objectStatus[key] = `Failed: ${error.code}`;
      }
    }
  }));

  trash.trashing = false;

  // If the user is deleting a folder then recursively list
  // objects and delete them
  // if (isFolder(objects[ii].Key) && store.delimiter) {
  //   const params = { Bucket: objects[ii].Bucket, Prefix: objects[ii].Key };
  //   s3.listObjects(params, (err, data) => {
  //     if (err) {
  //       if (!recursion) {
  //         // AccessDenied is a normal consequence of lack of permission
  //         // and we do not treat this as completely unexpected
  //         if (err.code === 'AccessDenied') {
  //           objects[ii].status = 'DENIED';
  //         } else {
  //           DEBUG.log(objects[ii].key, JSON.stringify(err));
  //           $(`#trash-td-${ii}`).html(`<span class="trasherror">Failed:&nbsp${err.code}</span>`);
  //           SharedService.showError(params, err);
  //         }
  //       } else {
  //         DEBUG.log(JSON.stringify(err));
  //         SharedService.showError(params, err);
  //       }
  //     } else if (data.Contents.length > 0) {
  //       deleteFiles(data.Contents, true);
  //     }
  //   });
  // }
};

const deleteButtonText = computed(() => objects.length ? `Delete (${objects.length})` : 'Delete');
const objectsRemaining = computed(() => !Object.keys(trash.objectStatus).length || !!Object.values(trash.objectStatus).find(status => !status || status !== 'DELETED'));
</script>