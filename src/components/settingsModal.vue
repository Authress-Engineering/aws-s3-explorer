<template>
  <div class="modal fade">
    <div class="modal-dialog">
      <div class="modal-content">
        <form name="settings_form" ng-submit="update()">
          <fieldset>
            <div class="modal-header">
              <buttonmodal fade type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</buttonmodal>
              <h4 class="modal-title">S3 Explorer: Settings</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <div class="panel panel-default">
                  <div class="panel-body">
                    <p><b>Bucket</b>: Please indicate which region and S3 bucket you want to explore.</p>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">Region</span>
                      <select name="region" class="form-control" ng-model="settings.region">
                        <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                        <option value="ap-northeast-3">Asia Pacific (Osaka-Local)</option>
                        <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                        <option value="ca-central-1">Canada (Central)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-west-2">EU (London)</option>
                        <option value="eu-west-3">EU (Paris)</option>
                        <option value="eu-north-1">EU (Stockholm)</option>
                        <option value="sa-east-1">South America (São Paulo)</option>
                        <option value="">US East (N. Virginia)</option>
                        <option value="us-east-2">US East (Ohio)</option>
                        <option value="us-west-1">US West (N. California)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                      </select>
                    </div>
                    <div class="input-group bottom-marg-10" ng-show="settings.buckets.length">
                      <span class="input-group-addon">Bucket</span>
                      <select name="bucketlist" class="form-control" ng-model="settings.selected_bucket" placeholder="bucket" ng-required="buckets.length">
                        <!-- <option value="" disabled selected>Select a bucket ...</option> -->
                        <option ng-repeat="bucket in settings.buckets" value="{{bucket}}">{{bucket}}</option>
                        <option value="">Other ...</option>
                      </select>
                    </div>
                    <div class="input-group bottom-marg-10" ng-hide="settings.buckets.length && settings.selected_bucket!=''">
                      <span class="input-group-addon">Bucket</span>
                      <input name="bucket" ng-model="settings.entered_bucket" type="text" class="form-control" placeholder="bucket" ng-required="!buckets.length"/>
                    </div>
                    <p><b>Authentication</b>: Please provide any credentials needed to access the bucket.</p>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">Authentication</span>
                      <select name="county" class="form-control" ng-model="settings.auth" required>
                        <option value="anon">Public Bucket (no authentication needed)</option>
                        <option value="auth">Private Bucket (I have AWS credentials)</option>
                        <option value="temp">Private Bucket (I have temporary AWS credentials)</option>
                      </select>
                    </div>
                    <p ng-hide="settings.auth=='anon'"><b>Credentials</b>: this web page uses the <a href="http://aws.amazon.com/sdk-for-browser/" target="_blank">AWS SDK for JavaScript in the Browser</a>. Your AWS credentials are kept in memory and used by the SDK for authentication. Your secret access key is used to sign API requests but it is <b>not</b> sent to the S3 service.</p>
                    <div class="input-group bottom-marg-10" ng-hide="settings.auth=='anon'">
                      <span class="input-group-addon">Access Key ID</span>
                      <input name="accesskey" type="text" ng-model="settings.cred.accessKeyId" class="form-control" ng-disabled="settings.auth=='anon'" placeholder="access key id" required/>
                    </div>
                    <div class="input-group bottom-marg-10" ng-hide="settings.auth=='anon'">
                      <span class="input-group-addon">Secret Access Key</span>
                      <input name="secretkey" type="password" ng-model="settings.cred.secretAccessKey" class="form-control" ng-disabled="settings.auth=='anon'" placeholder="secret access key" required/>
                    </div>
                    <div class="input-group bottom-marg-10" ng-show="settings.auth=='temp'">
                      <span class="input-group-addon">Session Token</span>
                      <input name="token" type="text" ng-model="settings.cred.sessionToken" class="form-control" ng-disabled="settings.auth!='temp'" placeholder="session token" required/>
                    </div>
                    <div class="input-group bottom-marg-10" ng-show="settings.auth=='auth'">
                      <span class="input-group-addon">Multi-Factor</span>
                      <select name="county" class="form-control" ng-model="settings.mfa.use" required>
                        <option value="no">No (I do not need to provide an MFA code)</option>
                        <option value="yes">Yes (I need to provide an MFA code)</option>
                      </select>
                    </div>
                    <div class="input-group bottom-marg-10" ng-show="settings.mfa.use=='yes'">
                      <span class="input-group-addon">MFA Code</span>
                      <input name="token" type="text" ng-model="settings.mfa.code" class="form-control" ng-disabled="settings.mfa.use=='no'" placeholder="MFA code" required/>
                    </div>
                    <p><b>Options</b>: S3 Explorer can show your S3 bucket contents folder-by-folder or it can show
                    a flat view of the entire bucket. Also, if you want to start in a folder that is not the root folder then enter the initial prefix below, for example <i>songs/</i>.</p>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">Initial View</span>
                      <select name="view" class="form-control" v-model="store.delimiter" required>
                        <option value="/">Folder (shows folder-by-folder)</option>
                        <option value="">Bucket (shows entire bucket contents)</option>
                      </select>
                    </div>
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">Initial Prefix</span>
                      <input name="prefix" type="text" ng-model="settings.prefix" class="form-control" placeholder="prefix e.g. songs/"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <div class="form-group">
                <div class="col-sm-offset-2 col-sm-10">
                  <button type="button" class="btn btn-default" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-primary"><i class='fa fa-cloud-download-alt fa-lg'></i>&nbsp;Query S3</button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </div>
</template>


<script setup>
import { reactive, onMounted } from 'vue'
import DEBUG from '../logger';

</script>