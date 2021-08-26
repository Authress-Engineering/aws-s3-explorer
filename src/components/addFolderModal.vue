<template>
  <div id="AddFolderModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <form name="add_folder_form">
          <div>
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              <h4 class="modal-title">S3 Explorer: New Folder</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <div class="panel panel-default">
                  <div class="panel-body">
                    <p>Please enter the relative path of the S3 folder to add, for example folder-01 or wallpaper/animals/dogs</p>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">{{store.view_prefix}}</span>
                      <input name="folder" v-model="entered_folder" type="text" class="form-control" placeholder="folder" required="true" />
                    </div>
                    <p>The new S3 folder will be {{store.view_prefix}}{{entered_folder}}.</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <div class="form-group">
                <div class="col-sm-offset-2 col-sm-10">
                  <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                  <button type="submit" @click="addFolder()" class="btn btn-primary"><i class='fa fa-folder-plus fa-lg'></i>&nbsp;Add Folder</button>
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
import { reactive, onMounted } from 'vue'
import DEBUG from '../logger';
import store from '../store';
  

defineProps({
  entered_folder: String
})

const addFolder = () => {
  DEBUG.log('Add folder');
  DEBUG.log('Current prefix:', store.view_prefix);

  const ef = stripLeadTrailSlash(entered_folder);
  const vpef = store.view_prefix + ef;
  const folder = `${stripLeadTrailSlash(vpef)}/`;
  DEBUG.log('Calculated folder:', folder);

  const s3 = new AWS.S3(AWS.config);
  const params = { Bucket: store.currentBucket, Key: folder };

  DEBUG.log('Invoke headObject:', params);

  // Test if an object with this key already exists
  s3.headObject(params, (err1, _data1) => {
    if (err1 && err1.code === 'NotFound') {
      DEBUG.log('Invoke putObject:', params);

      // Create a zero-sized object to simulate a folder
      s3.putObject(params, (err2, _data2) => {
      if (err2) {
        DEBUG.log('putObject error:', err2);
        bootbox.alert('Error creating folder:', err2);
      } else {
        addFolder(params.Bucket, params.Key);
        console.error('*** Implement closing this modal')
      }
      });
    } else if (err1) {
      bootbox.alert('Error checking existence of folder:', err1);
    } else {
      bootbox.alert('Error: folder or object already exists at', params.Key);
    }
  });
};
</script>