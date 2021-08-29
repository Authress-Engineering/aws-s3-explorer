<template>
  <div>
    <div class="modal-dialog">
      <div class="modal-content">
        <form name="settings_form">
          <div>
            <div class="modal-header">
              <h4 class="modal-title">Select an S3 Bucket</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <h4>Current Bucket: <strong>{{ store.currentBucket }}</strong></h4>
                <br>
                <h4>Select a bucket or specify a new one:</h4>
                <multiselect
                  v-model="store.currentBucket"
                  :options="store.rememberedBuckets.map(b => b.bucket)"
                  placeholder="Select a bucket or enter a new one"
                  :showLabels="false" :allowEmpty="false" :taggable="true"
                  open-direction="bottom" :hideSelected="true"
                  :closeOnSelect="true" selectLabel="(press enter to select)" tag-placeholder="(press enter to select)"
                  @tag="newBucketEntered" @select="bucketSelected">
                  <template #noOptions><small>Enter a bucket</small></template>
                  <template #placeholder>Search for bucket</template>
                </multiselect>
                <br>
                
                <div v-if="state.showError === 'CORS'">
                  <ul class="nav nav-tabs" data-tabs="tabs">
                  <li role="presentation" class="active"><a href="#cors" data-toggle="tab">CORS</a></li>
                  </ul>
                  <div id="my-tab-content" class="tab-content">
                    <div class="tab-pane active" id="cors">
                      <p>The browser cannot display the contents of this Amazon S3 bucket because it is missing proper cross-origin resource sharing (CORS) configuration.</p>
                      <p>To configure CORS, you create a CORS configuration that identifies the origins allowed to access your bucket and the operations (HTTP methods) supported.</p>
                      <p>To do this, go to the Amazon S3 Console, select your bucket in the buckets panel, and click to reveal Permissions in the Properties pane. Click Edit CORS Configuration. The CORS Configuration Editor panel will open up with a field where you can enter a CORS Configuration. Enter a configuration similar to the following:</p>
                      <p>
                        <pre>{{ JSON.stringify(state.suggestedCorsConfiguration, null, 2) }}</pre>
                      </p>
                    </div>
                  </div>
                </div>

                <div v-else-if="state.showError === 'PERMISSIONS'">
                  <ul class="nav nav-tabs" data-tabs="tabs">
                  <li role="presentation" class="active"><a href="#cors" data-toggle="tab">Access Denied</a></li>
                  </ul>
                  <div id="my-tab-content" class="tab-content">
                    <div class="tab-pane active" id="cors">
                      <p>The role you are using is not configured to allow access to this bucket.</p>
                      <p>To configure permissions, you create a bucket policy configuration that identifies the origins allowed to access your bucket and the operations (HTTP methods) supported.</p>
                      <p>To do this, go to the Amazon S3 Console, select your bucket in the buckets panel, and click to reveal Permissions in the Properties pane. Click Edit CORS Configuration. The CORS Configuration Editor panel will open up with a field where you can enter a CORS Configuration. Enter a configuration similar to the following:</p>
                      <p>
                        <pre>{{ JSON.stringify(state.suggestedCorsConfiguration, null, 2) }}</pre>
                      </p>
                    </div>
                  </div>
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
import { DateTime } from 'luxon';
import Multiselect from '@suadelabs/vue3-multiselect';
import DEBUG from '../logger';
import store from '../store';
import { validateConfiguration } from '../bucketManager';

const state = reactive({
  showCorsError: false,
  suggestedCorsConfiguration: [{
    "AllowedHeaders": [ "*" ],
    "AllowedMethods": [ "PUT", "POST", "DELETE", "HEAD", "GET" ],
    "AllowedOrigins": [ "https://rhosys.github.io", "https://console.rhosys.ch" ],
    "ExposeHeaders": [ "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2" ],
    "MaxAgeSeconds": 3000
  }]
});

const newBucketEntered = newBucket => {
  store.rememberedBuckets.push({ bucket: newBucket });
  store.currentBucket = newBucket;
  bucketSelected(newBucket);
};

const bucketSelected = async bucket => {
  state.showError = null;
  try {
    await validateConfiguration(bucket);
  } catch (configurationError) {
    if (configurationError.message === 'CORS') {
      state.showError = 'CORS';
      return;
    }

    if (configurationError.message === 'PERMISSIONS') {
      state.showError = 'PERMISSIONS';
      return;
    }

    DEBUG.log('Failed to look up information about the bucket', configurationError);
  }

  store.showBucketSelector = false;
};

onMounted(async () => {
  if (store.currentBucket) {
    await bucketSelected(store.currentBucket);
  }
});

</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style lang="scss">
.multiselect__option--selected.multiselect__option--highlight {
  background: #41b883 !important;
}

input.multiselect__input {
  &::placeholder {
    color: lightgrey !important;
  }
}
</style>