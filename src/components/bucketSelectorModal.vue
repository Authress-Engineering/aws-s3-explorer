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
                <h4>Select a bucket or specify a new one:</h4>
                <multiselect
                  v-model="store.currentBucket"
                  :options="store.rememberedBuckets"
                  placeholder=""
                  :showLabels="false" :allowEmpty="false" :taggable="true"
                  open-direction="bottom"
                  :hide-selected="true" :closeOnSelect="true" selectLabel="(press enter to select)" tag-placeholder="(press enter to select)"
                  @tag="newBucketEntered" @select="bucketSelected">
                  <template #noOptions><small>Enter a bucket</small></template>
                  <template #placeholder>Search for bucket</template>
                </multiselect>

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

const newBucketEntered = newBucket => {
  store.rememberedBuckets.push(newBucket);
  store.currentBucket = newBucket;
  store.showBucketSelector = false;
};

const bucketSelected = () => {
  store.showBucketSelector = false;
};

</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>