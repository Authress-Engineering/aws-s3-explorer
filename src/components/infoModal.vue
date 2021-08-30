<template>
  <div id="InfoModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" @click="close" aria-hidden="true">&times;</button>
          <h4 class="modal-title">S3 Explorer: Information</h4>
        </div>
        <div class="modal-body">
          <div class="col-md-18">
            <ul class="nav nav-tabs" data-tabs="tabs">
              <li role="presentation" class="active"><a href="#about" data-toggle="tab">About</a></li>
              <li role="presentation"><a href="#cors" v-if="store.currentBucket || !info.cors" data-toggle="tab">CORS</a></li>
              <li role="presentation"><a href="#policy" v-if="store.currentBucket || !info.policy" data-toggle="tab">Bucket Policy</a></li>
              <li role="presentation"><a href="#corsref" data-toggle="tab">CORS Reference</a></li>
              <li role="presentation"><a href="#policyref" data-toggle="tab">Policy Reference</a></li>
            </ul>
            <div id="my-tab-content" class="tab-content">
              <div class="tab-pane active" id="about">
                <br/>
                <p>Amazon S3 Explorer is an application that uses the AWS JavaScript SDK in the Browser to make the contents of an S3 bucket easy to view in a web browser.</p>
                <p>To upload files, first navigate to the bucket &amp; folder of your choice and then drag &amp; drop files onto the main S3 Explorer table.</p>
                <p>To delete files, first choose the files you want to delete by clicking checkboxes in the Select column, then click the Trash icon. You will be asked to confirm this action.</p>
                <p>For more details and to download the source code, see our <a target="_blank" href="https://github.com/rhosys/aws-s3-explorer">GitHub page</a>.</p>
              </div>
              <div class="tab-pane" id="cors" v-if="info.cors">
                <br/>
                <p>The currently configured CORS Configuration for {{store.currentBucket}} is below.</p>
                <pre><span id="info-cors"></span></pre>
              </div>
              <div class="tab-pane" id="policy" v-if="info.policy">
                <br/>
                <p>The currently configured Bucket Policy for {{store.currentBucket}} is below.</p>
                <pre><span id="info-policy"></span></pre>
              </div>
              <div class="tab-pane" id="corsref">
                <br/>
<p>
JavaScript in the browser cannot display the contents of an Amazon S3 bucket unless the bucket has the proper cross-origin resource sharing (CORS) configuration.
</p>
<p>
To configure CORS, you create a CORS configuration that identifies the origins allowed to access your bucket and the operations (HTTP methods) supported.
</p>
<p>
To do this, select your bucket in the buckets panel of the Amazon S3 Console and click to reveal Permissions in the Properties pane. Click Edit CORS Configuration. The CORS Configuration Editor panel will open up with a field where you can enter a CORS Configuration. Enter a configuration similar to the following:
</p>
                  <p>
<pre>
  [
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT", "POST", "DELETE", "HEAD", "GET"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
</pre>
<p>
Please see the project <a target="_blank" href="https://github.com/awslabs/aws-js-s3-explorer/blob/v2-alpha/README.md">README</a> for more specific details on how to create an appropriate CORS configuration.
</p>

                  </p>
                </div>
                <div class="tab-pane" id="policyref">
                  <br/>
                  <p>Here is a sample S3 bucket policy that you can use. Change <i>999999999999</i> to your AWS account number and change <i>mybucket</i> to your bucket name.</p>
                  <p>
<pre>
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PermissionsForUser",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::AWS_ACCOUNT_ID:roles/ROLE_ID"
    },
    "Action": "s3:*",
    "Resource": "arn:aws:s3:::{{ store.currentBucket }}/*"
  }]
}
</pre>
<p>
Please see the project <a target="_blank" href="https://github.com/awslabs/aws-js-s3-explorer/blob/v2-alpha/README.md">README</a> for more specific details on how to create an appropriate S3 bucket policy.
</p>
                    </p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button type="button" class="btn btn-default" @click="close">Close</button>
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
import store from '../store';

const info = reactive({ policy: null, cors: null });

onMounted(() => {
  const params = { Bucket: store.currentBucket };
  DEBUG.log('call getBucketPolicy:', store.currentBucket);

  const s3client = new AWS.S3({ maxRetries: 0, region: store.region });
  s3client.getBucketPolicy(params, (err, data) => {
    let text;
    if (err && err.code === 'NetworkingError') {
      info.cors = 'This bucket does not have CORS enabled, preventing gathering information about it.';
    } else if (err && err.code === 'NoSuchBucketPolicy') {
      DEBUG.log(err);
      info.policy = 'No bucket policy.';
    } else if (err) {
      DEBUG.log(err.code, err);
      info.policy = JSON.stringify(err);
    } else {
      DEBUG.log(data.Policy);
      info.policy = JSON.stringify(JSON.parse(data.Policy.trim()), null, 2);
    }
  });

  s3client.getBucketCors(params, (err, data) => {
    let text;
    if (err && err.code === 'NetworkingError') {
      info.cors = 'This bucket does not have CORS enabled.';
    } else if (err && err.code === 'NoSuchCORSConfiguration') {
      DEBUG.log(err);
      info.cors = 'This bucket has no CORS configuration.';
    } else if (err) {
      DEBUG.log(err.code, err);
      info.cors = JSON.stringify(err);
    } else {
      DEBUG.log(data.CORSRules);
      info.cors = JSON.stringify(data.CORSRules, null, 2);
    }
  });
});

const close = () => {
};
</script>
