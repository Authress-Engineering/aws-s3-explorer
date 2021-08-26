<template>
  <div id="TrashModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
          <h4 class="modal-title">S3 Explorer: Delete {{trash.count}} objects</h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <div class="panel-body">
              <p>
              Please confirm that you want to delete the following objects from S3.
              </p>
              <br/>
              <table class="table table-bordered table-hover table-striped" id="trash-table">
                <thead id="trash-thead">
                  <tr>
                    <th></th>
                    <th>Object</th>
                    <th>Folder</th>
                    <th>Last Modified</th>
                    <th>Timestamp</th>
                    <th>Class</th>
                    <th>Size</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody id="trash-tbody">
                  <tr v-for="(o, index) in objects" :key="o.object">
                    <td>{{index + 1}}</td>
                    <td>{{o.object}}</td>
                    <td>{{o.folder}}</td>
                    <td>{{o.last_modified}}</td>
                    <td>{{o.timestamp}}</td>
                    <td>{{o.class}}</td>
                    <td>{{o.size}}</td>
                    <td :id="trash-td-{{index}}"><i>n/a</i></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button id="trash-btn-cancel" type="button" class="btn btn-default" @click="closeModal">{{ objects.length ? 'Cancel' : 'Close' }}</button>
              <button id="trash-btn-delete" type="submit" class="btn btn-danger" @click="deleteFiles(objects)" :disabled="trash.trashing || !objects.length"><i class="fa fa-trash-alt fa-lg"></i>&nbsp;{{ deleteButtonText }}</button>
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
import { path2short, isFolder } = from '../converts';

DEBUG.log('TrashController init');
const trash = reactive({ title: null, trashing: false });

defineProps({
  objects: Array
});

const deleteFiles = (objects, recursion) => {
  DEBUG.log('Delete files:', objects);
  trash.trashing = true;

  for (let ii = 0; ii < objects.length; ii++) {
    DEBUG.log('Delete key:', objects[ii].Key);
    DEBUG.log('Object:', objects[ii]);
    DEBUG.log('Index:', ii);

    const s3 = new AWS.S3(AWS.config);

    // If the user is deleting a folder then recursively list
    // objects and delete them
    if (isFolder(objects[ii].Key) && store.delimiter) {
      const params = { Bucket: objects[ii].Bucket, Prefix: objects[ii].Key };
      s3.listObjects(params, (err, data) => {
        if (err) {
          if (!recursion) {
            // AccessDenied is a normal consequence of lack of permission
            // and we do not treat this as completely unexpected
            if (err.code === 'AccessDenied') {
              $(`#trash-td-${ii}`).html('<span class="trasherror">Access Denied</span>');
            } else {
              DEBUG.log(JSON.stringify(err));
              $(`#trash-td-${ii}`).html(`<span class="trasherror">Failed:&nbsp${err.code}</span>`);
              SharedService.showError(params, err);
            }
          } else {
            DEBUG.log(JSON.stringify(err));
            SharedService.showError(params, err);
          }
        } else if (data.Contents.length > 0) {
          deleteFiles(data.Contents, true);
        }
      });
    }

    const params = { Bucket: objects[ii].Bucket, Key: objects[ii].Key };

    DEBUG.log('Delete params:', params);
    s3.deleteObject(params, (err, _data) => {
      if (err) {
        if (!recursion) {
          // AccessDenied is a normal consequence of lack of permission
          // and we do not treat this as completely unexpected
          if (err.code === 'AccessDenied') {
            $(`#trash-td-${ii}`).html('<span class="trasherror">Access Denied</span>');
          } else {
            DEBUG.log(JSON.stringify(err));
            $(`#trash-td-${ii}`).html(`<span class="trasherror">Failed:&nbsp${err.code}</span>`);
            SharedService.showError(params, err);
          }
        } else {
          DEBUG.log(JSON.stringify(err));
          SharedService.showError(params, err);
        }
      } else {
        DEBUG.log('Deleted', objects[ii].Key, 'from', objects[ii].Bucket);

        if (!recursion) {
          $(`#trash-td-${ii}`).html('<span class="trashdeleted">Deleted</span>');
        }

        trash.button = `Delete (${count})`;

        // If all files deleted then update buttons
        if (count === 0) {
          $btnDelete.hide();
          trash.cancelButtonText = 'Close';
        }

        console.error('** Force a refresh everywhere');
      }
    });
  }
};

const deleteButtonText = computed({
  get: () => {
    return objects.length ? `Delete (${objects.length})` : 'Delete';
  }
});
</script>