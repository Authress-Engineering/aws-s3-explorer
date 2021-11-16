<template>
  <div>
    <div class="modal-dialog">
      <div class="modal-content">
        <form @submit.prevent="cognitoLogin()">
          <div>
            <div class="modal-header">
              <h4 class="modal-title">S3 Explorer: Settings</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <h2>Welcome to the AWS S3 Explorer</h2>
                <div class="" style="width: 100%;">
                  <div>
                    To log in specify the following configuration:
                  </div>
                  <br>
                  <div style="display: flex; align-items: center">
                    <span style="flex-grow: 1; flex-shrink: 0; margin-right: 0.5rem">AWS AccountId:&nbsp;</span><br>
                    <input name="AWS AccountId" v-model="store.awsAccountId" type="text" class="form-control" placeholder="742482629247" required="true" style="flex-grow: 1; margin-right: 0.5rem">
                    <button style="flex-grow: 1; margin-right: 0.5rem" type="submit" class="btn btn-primary" :disabled="!store.awsAccountId"><i class="fas fa-sign-in-alt" /> Login</button>
                  </div>

                  <hr>
                  
                  <div>
                    <h4>One time AWS Cloud Formation setup</h4>
                    The S3 Explorer provides a quick setup step using a CFN template. Follow the steps to configure your account, and only need to be run once per AWS account.
                    <ol>
                      <br>
                      <li>
                        <div style="display: flex; align-items: center; justify-content: space-between">
                          <span>Launch the CFN template:<br><small>(you'll be able to review on the next screen)</small><br></span>
                          <a :href="launchStackUrl || '#'" :target="launchStackUrl ? '_blank' : '_self'" :class="{ 'disabled': !launchStackUrl }"><img src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"></a>
                        </div>
                      </li>
                      <br>
                      <li>
                        Wait for the app to be completely deployed and then enter your AWS Account ID:
                        <div>
                          <input name="AWS AccountId" v-model="store.awsAccountId" type="text" class="form-control" placeholder="742482629247" required="true"
                            style="flex-grow: 1; margin-right: 0.5rem; width: 200px;" maxlength="20">
                        </div>
                      </li>
                      <br>
                      <li>
                        Next you'll connect your SSO Provider to Cognito, follow your provider's guide to create a new client. Set the <strong>Redirect URI</strong> property set it to be:<br>
                        <div class="input-group">
                          <input name="AWS AccountId" :value="`https://${store.awsAccountId || ''}-s3explorer.auth.${store.region}.amazoncognito.com/oauth2/idpresponse`"
                            type="text" class="form-control" placeholder="742482629247" required="true" style="flex-grow: 1;" :disabled="true">
                          <span class="input-group-btn">
                            <button style="flex-grow: 1;" class="btn btn-primary" type="button" :disabled="!store.awsAccountId"
                              @click="copyCognitoPoolCallbackUrl">
                                <span v-if="!state.copyButtonSuccess"><i class="fas fa-copy" /> Copy</span>
                                <span v-else><i class="fas fa-check" /> Copy</span>
                            </button>
                          </span>

                        </div>
                      </li>
                      <br>
                      <li>
                        Navigate to the newly created Cognito Pool and configure:
                        <ul>
                          <li><a :href="`${generatedCognitoPoolUrl}/federation-identity-providers`" target="_blank">
                            Federation > Identity providers</a><br>Select an identity provider and fill in the credentials.
                          </li>
                          <li><a :href="`${generatedCognitoPoolUrl}//app-integration-app-settings`" target="_blank">
                            App integration > App client settings > Enabled Identity Providers</a><br>Enable the new identity provider, that you just linked (then click <strong>Save</strong>)
                          </li>
                        </ul>
                      </li>
                    </ol>
                  </div>

                  <div v-if="false">
                    <h4>Setup Cognito SSO Login</h4>
                    Or setup up a cognito pool, cognito identity pool, and configure the explorer.
                    <ol>
                      <li>
                        Cognito User Pool:
                          <ul>
                            <li>Create a User Pool in any region (Not an identity pool)</li>
                            <li>Since we will use SSO, most of the configuration is irrelevant</li>
                            <!-- <li><strong>General settings > Users and Groups > Groups</strong> > Update the auto generated group with a role that has access to the necessary buckets</li> -->
                            <li><strong>General settings > App clients</strong> > Add the S3 Explorer as an app</li>
                            <li><strong>Federation > Identity providers</strong> > Add your SSO provider of choice to the OAuth settings</li>
                            <li><strong>App Integration > App client settings</strong> > Enable identity provider just created</li>
                            <li>Specify <strong>https://rhosys.github.io/aws-s3-explorer/</strong> as the callback and logout urls</li>
                            <li>Specify <strong>Authorization code grant</strong> flow and enable All <strong>Allowed OAuth Scopes</strong></li>
                            <li><strong>App Integration > Domain name</strong> > Configure the setup for a domain (either Cognito or your own custom one.</li>
                          </ul>
                      </li>
                      <li>
                        Cognito Identity Pool:
                          <ul>
                            <li>Create an identity pool in the same region as the user pool</li>
                            <li>Create a role which the pool can assume that has access to the relevant S3 resources.</li>
                            <li>Specify the Cognito Pool from the previous step as the Authentication Provider</li>
                          </ul>
                      </li>
                      <li>Return here and enter the Cognito user pool login URL, ID, and identity pool ID above.</li>
                    </ol>
<!-- 
                    <div class="input-group bottom-marg-10">
                      <span class="input-group-addon">Region</span>
                      <select name="region" class="form-control" v-model="state.region">
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
                    </div> -->
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
import { reactive, computed } from 'vue';
import { copyText } from 'vue3-clipboard';

import store from '../store';
import { login, setConfiguration } from '../awsUtilities';

const state = reactive({ region: null, copyButtonSuccess: false });

const suggestedRegion = 'eu-west-1';

const generatedCognitoPoolUrl = computed(() => `https://${store.region}.console.aws.amazon.com/cognito/users?region=${store.region}#/pool/${store.cognitoPoolId}`);
const launchStackUrl = computed(() => {
  if (store.awsAccountId) {
    return `https://${suggestedRegion}.console.aws.amazon.com/lambda/home?region=${suggestedRegion}#/create/app?applicationId=arn:aws:serverlessrepo:eu-west-1:922723803004:applications/S3-Explorer`;
  }
  return null;
});

const cognitoLogin = async () => {
  await setConfiguration(store.awsAccountId);
  await login(true);
};

const copyCognitoPoolCallbackUrl = () => {
  copyText(`https://${store.awsAccountId}-s3explorer.auth.${store.region || suggestedRegion}.amazoncognito.com/oauth2/idpresponse`, undefined, () => {
    state.copyButtonSuccess = true;
    setConfiguration(store.awsAccountId);
  });
};
</script>
