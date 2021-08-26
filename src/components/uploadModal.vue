<template>
  <div id="UploadModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
          <h4 class="modal-title">Upload to:&nbsp;{{upload.title}}</h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <div class="panel-body">
              <p>
              Please confirm that you want to upload the following files to S3.
              </p>
              <table class="table table-bordered table-hover table-striped" id="upload-table">
                <thead id="upload-thead">
                  <tr>
                    <th></th>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody id="upload-tbody">
                  <tr v-for="(file, index) in upload.files" :key="file.short">
                    <td>{{index + 1}}</td>
                    <td>{{file.short}}</td>
                    <td>{{file.type}}</td>
                    <td>{{file.size}}</td>
                    <td id="upload-td-{{index}}">
                      <span id="upload-td-progress-{{index}}" class="progress-bar" data-percent="0"></span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p>
              The selected files will be uploaded to {{upload.title}}
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <!-- <button id="upload-btn-cancel" type="button" class="btn btn-default" data-dismiss="modal">Cancel</button> -->
              <button id="upload-btn-cancel" type="button" @click="onCancel" class="btn btn-default">{{ upload.buttonText }}</button>
              <button id="upload-btn-upload" type="submit" class="btn btn-primary" :disabled="upload.uploading"><i class="fa fa-cloud-upload-alt fa-lg"></i>&nbsp;{{ upload.button }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { reactive, onMounted } from 'vue'
import DEBUG from '../logger';

const upload = reactive({ cancelButtonText: 'Cancel', button: null, title: null, files: [], uploads: [] });

const onCancel = (e2) => {
    e2.preventDefault();

    // If uploads still in progress then cancel them all
    if (upload.uploads && upload.uploads.length > 0) {
      console.log(`Cancel ${upload.uploads.length} uploads`);
      upload.uploads.forEach(upl => upl.abort());
    } else {
      console.error('Close upload modal.');
    }
  };

  //
  // Upload a list of local files to the provided bucket and prefix
  //
  uploadFiles = (Bucket, prefix) => {
    $scope.$apply(() => {
      upload.uploads = [];
      upload.uploading = true;
    });

    DEBUG.log('Dropped files:', upload.files);

    upload.files.forEach((file, ii) => {
      DEBUG.log('File:', file);
      DEBUG.log('Index:', ii);

      $(`#upload-td-${ii}`).html(
        `<div class="progress"><span id="upload-td-progress-${ii}" class="progress-bar" data-percent="0">0%</span></div>`,
      );

      const s3 = new AWS.S3(AWS.config);
      const params = {
        Body: file.file, Bucket, Key: (prefix || '') + (file.file.fullPath ? file.file.fullPath : file.file.name), ContentType: file.file.type,
      };

      const upl = s3.upload(params);
      $scope.$apply(() => {
        upload.uploads.push(upl);
      });

      const funcprogress = (evt) => {
        DEBUG.log('File:', file, 'Part:', evt.part, evt.loaded, 'of', evt.total);
        const pc = evt.total ? ((evt.loaded * 100.0) / evt.total) : 0;
        const pct = Math.round(pc);
        const pcts = `${pct}%`;
        const col = $(`#upload-td-progress-${ii}`);
        col.attr('data-percent', pct);
        col.css('width', pcts).text(pcts);
      };

      const funccancelled = (_file) => {
        const col = $(`#upload-td-progress-${ii}`);
        col.attr('data-percent', 100);
        col.css('width', '100%').text('Cancelled');
        col.addClass('progress-bar-danger');
      };

      const funcsend = (err, data) => {
        if (err) {
          // AccessDenied is a normal consequence of lack of permission
          // and we do not treat this as completely unexpected
          if (err.code === 'AccessDenied') {
            $(`#upload-td-${ii}`).html('<span class="uploaderror">Access Denied</span>');
          } else if (err.code === 'RequestAbortedError') {
            DEBUG.log('Abort upload:', file);
            funccancelled(file);
            upload.cancelButtonText = 'Close';
          } else {
            DEBUG.log(JSON.stringify(err));
            $(`#upload-td-${ii}`).html(`<span class="uploaderror">Failed:&nbsp${err.code}</span>`);
            SharedService.showError(params, err);
          }
        } else {
          DEBUG.log('Uploaded', file.file.name, 'to', data.Location);
          $(`#upload-td-progress-${ii}`).addClass('progress-bar-success');

          $scope.$apply(() => {
            upload.button = `Upload (${count})`;
            upload.uploads = upload.uploads.filter(f => f !== upl);
          });
        }

        // If all files complete then update buttons and refresh view
        if (count === 0) {
          upload.cancelButtonText = 'Close';
          console.error('** Force a refresh everywhere');
        }
      };

      // Kick off the upload and report progress
      upl.on('httpUploadProgress', funcprogress).send(funcsend);
    });
  };

  // Wrap readEntries in a promise to make working with readEntries easier
  async function readEntriesPromise(directoryReader) {
    try {
      return new Promise((resolve, reject) => {
        directoryReader.readEntries(resolve, reject);
      });
    } catch (err) {
      DEBUG.log(err);
      return undefined;
    }
  }

  // Get all the entries (files or sub-directories) in a directory
  // by calling readEntries until it returns empty array
  async function readAllDirectoryEntries(directoryReader) {
    const entries = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
      entries.push(...readEntries);
      // eslint-disable-next-line no-await-in-loop
      readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
  }

  // Retrieve File object from FileEntry
  async function filePromise(fileEntry) {
    try {
      return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
    } catch (err) {
      DEBUG.log(err);
      return undefined;
    }
  }

  // Get all files recursively
  async function getAllFileEntries(dataTransferItemList) {
    const fileEntries = [];
    const queue = [];
    for (let i = 0; i < dataTransferItemList.length; i++) {
      const dtItem = dataTransferItemList[i];
      queue.push(typeof dtItem.webkitGetAsEntry === 'function' ? dtItem.webkitGetAsEntry() : dtItem.getAsEntry());
    }
    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry) {
        if (entry.isFile) {
          // eslint-disable-next-line no-await-in-loop
          const file = await filePromise(entry);
          file.fullPath = entry.fullPath.substring(1);
          fileEntries.push(file);
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          // eslint-disable-next-line no-await-in-loop
          queue.push(...await readAllDirectoryEntries(reader));
        }
      }
    }
    return fileEntries;
  }

  // Wrapper to get files safely
  async function getFilesList(dataTransfer) {
    if (dataTransfer.items.length > 0) {
      if (typeof dataTransfer.items[0].webkitGetAsEntry === 'function' ||
        typeof dataTransfer.items[0].getAsEntry === 'function') {
        return getAllFileEntries(dataTransfer.items);
      }

      DEBUG.log('Cannot do folders upload, falling back to files only');
      return dataTransfer.files;
    }

    return [];
  }

  //
  // Drag/drop handler for files to be uploaded
  //
  dropZone = (target) => {
    target
      .on('dragover', () => {
        target.addClass('dragover');
        return false;
      })
      .on('dragend dragleave', () => {
        target.removeClass('dragover');
        return false;
      })
      .on('drop', async (e) => {
        DEBUG.log('Dropped files');
        e.stopPropagation();
        e.preventDefault();

        target.removeClass('dragover');

        bucketLoader.addClass('fa-spin');
        const files = SharedService.hasAddedFiles()
          ? SharedService.getAddedFiles()
          : await getFilesList(e.originalEvent.dataTransfer);
        bucketLoader.removeClass('fa-spin');

        if (!files.length) {
          DEBUG.log('Nothing to upload');
          return false;
        }

        upload.files = [];
        for (let ii = 0; ii < files.length; ii++) {
          const fileii = files[ii];

          // See https://github.com/awslabs/aws-js-s3-explorer/issues/71
          if (fileii.type || fileii.size % 4096 !== 0 || fileii.size > 1048576) {
            DEBUG.log('File:', fileii.name, 'Size:', fileii.size, 'Type:', fileii.type);

            upload.files.push({
              file: fileii,
              name: fileii.fullPath || fileii.name,
              type: fileii.type,
              size: bytesToSize(fileii.size),
              short: path2short(fileii.fullPath || fileii.name),
            });
          }
        }

        const { bucket } = SharedService.getSettings();
        const prefix = store.getViewPrefix();

        upload.title = `${bucket}/${prefix || ''}`;
        upload.button = `Upload (${files.length})`;
        upload.uploading = false;

        // Reset files selector
        if (SharedService.hasAddedFiles()) {
          SharedService.resetAddedFiles();
          $('#addedFiles').val('');
        }

        return false;
      });
  };

  

  // Enable dropzone behavior and highlighting
  dropZone($('.dropzone'));

  // Simulate drop event on change of files selector
  $('#addedFiles').on('change', (e) => {
    SharedService.addFiles(e.target.files);
    $('.dropzone').trigger('drop');
  });
}

</script>