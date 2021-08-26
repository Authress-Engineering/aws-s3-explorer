<template>
  <div id="ErrorModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
          <h4 class="modal-title">S3 Explorer: Error ({{error.code}})</h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <div class="panel-body">
              <p>An error was detected: {{message}}</p>
              <div class="collapse" id="collapseAdvanced">
                <div class="well-sm">
                  <table class="table table-bordered table-hover table-striped" id="error-table">
                    <thead id="error-thead">
                      <tr>
                        <th>#</th>
                        <th>Key</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody id="error-tbody">
                      <tr v-for="(e, index) in errors" :key="e.key">
                        <td>{{index + 1}}</td>
                        <td>{{e.key}}</td>
                        <td>{{e.value}}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button type="button" class="btn btn-default" data-toggle="collapse" data-target="#collapseAdvanced" aria-expanded="false" aria-controls="collapseAdvanced"><i class="fa fa-cog" aria-hidden="true">&nbsp;</i>Advanced</button>
              <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
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

defineProps({
  errors: Array,
  message: String
});

onMounted(() => {
  DEBUG.log('ErrorController init');
});

</script>