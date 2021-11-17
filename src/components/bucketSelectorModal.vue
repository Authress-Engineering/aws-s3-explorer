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
                  v-model.trim="store.currentBucket"
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

                <div v-if="state.showError === 'FETCH_ALL_BUCKETS'">
                  <ul class="nav nav-tabs" data-tabs="tabs">
                  <li role="presentation" class="active"><a href="#cors" data-toggle="tab">Listing Bucket Information</a></li>
                  </ul>
                  <div id="my-tab-content" class="tab-content">
                    <div class="tab-pane active" id="cors">
                      <p>AWS S3 Service prevents the direct look up of buckets that a user or role has access to through the browser. Therefore they must be entered here.
                        If the list of available buckets frequently changes and needs to be dynamically rendered it can be loaded at runtime using a configurable bucket list.</p>
                      <p>This functionality is currently under development, for additional information please create a <a href="https://github.com/Rhosys/aws-s3-explorer/issues" target="_blank">GitHub Issue</a>.</p>
                    </div>
                  </div>
                </div>
                
                <div v-if="state.showError === 'CORS'">
                  <ul class="nav nav-tabs" data-tabs="tabs">
                  <li role="presentation" class="active"><a href="#cors" data-toggle="tab">CORS</a></li>
                  </ul>
                  <div id="my-tab-content" class="tab-content">
                    <div class="tab-pane active" id="cors">
                      <p>The browser cannot display the contents of this Amazon S3 bucket because it is missing proper cross-origin resource sharing (CORS) configuration.</p>
                      <p>To configure CORS, you create a CORS configuration that identifies the origins allowed to access your bucket and the operations (HTTP methods) supported.</p>
                      <p>To do this, go to the Amazon S3 Console, select your bucket in the buckets panel, and click to reveal Permissions in the Properties pane. Click Edit CORS Configuration.
                        The CORS Configuration Editor panel will open up with a field where you can enter a CORS Configuration. Enter a configuration similar to the following:</p>
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
                      <p>To configure permissions, update the IAM role (<strong>{{ store.userRoleId}}</strong>) created as part of the S3 Explorer setup.
                      The dedicated role should grant permissions similar the following:</p>
                      <p>
                        <pre>{{ JSON.stringify(state.suggestedBucketPolicy, null, 2) }}</pre>
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div class="modal-footer">
              <div class="form-group">
                <div class="col-sm-offset-2 col-sm-10">
                  <button type="button" class="btn btn-primary" @click="store.showBucketSelector = false">Close</button>
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
import { reactive, onMounted } from 'vue';
import Multiselect from '@suadelabs/vue3-multiselect';
import DEBUG from '../logger';
import store from '../store';
import { validateConfiguration } from '../bucketManager';

const state = reactive({
  showCorsError: null,
  suggestedCorsConfiguration: [{
    AllowedHeaders: ['*'],
    AllowedMethods: ['PUT', 'POST', 'DELETE', 'HEAD', 'GET'],
    AllowedOrigins: [window.location.origin ?? 'https://console.rhosys.ch'],
    ExposeHeaders: ['x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2'],
    MaxAgeSeconds: 3000
  }],
  suggestedBucketPolicy: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:*'], Resource: ['*'] }] }
});

const bucketSelected = async (bucket, skipClose) => {
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

  if (!skipClose) {
    store.showBucketSelector = false;
  }
};

const newBucketEntered = newBucketRaw => {
  const newBucket = newBucketRaw && newBucketRaw.trim();
  store.rememberedBuckets.push({ bucket: newBucket });
  store.currentBucket = newBucket;
  bucketSelected(newBucket);
};

onMounted(async () => {
  if (store.currentBucket) {
    await bucketSelected(store.currentBucket, true);
  }

  if (!store.rememberedBuckets.length) {
    state.showError = 'FETCH_ALL_BUCKETS';
  }
});

</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style lang="scss" scoped>
  ::v-deep(.multiselect__option--selected.multiselect__option--highlight) {
    background: #41b883 !important;
  }

  ::v-deep(input.multiselect__input) {
    &::placeholder {
      color: lightgrey !important;
    }
  }

  ::v-deep(.multiselect__placeholder) {
    margin-bottom: unset !important;
  }
</style>
