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
                    <input name="AWS AccountId" v-model.trim="store.awsAccountId"
                      type="text" class="form-control" placeholder="742482629247" required="true" style="flex-grow: 1; margin-right: 0.5rem">
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
                          <input name="AWS AccountId" v-model.trim="store.awsAccountId" type="text" class="form-control" placeholder="742482629247" required="true"
                            style="flex-grow: 1; margin-right: 0.5rem; width: 200px;" maxlength="20">
                        </div>
                      </li>
                    </ol>
                    <hr>
                    <h4>[Optional] Connecting an SSO provider to Cognito:</h4>
                    <ol>
                      <li>
                        Follow your provider's guide to create a new client.<br>Set the <strong>Redirect URI</strong> property set it to be:<br>
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
                            Federation > Identity providers</a><br>Select your SSO identity provider and fill in the credentials.
                          </li>
                          <li><a :href="`${generatedCognitoPoolUrl}//app-integration-app-settings`" target="_blank">
                            App integration > App client settings > Enabled Identity Providers</a><br>Enable the new identity provider, that you just linked (then click <strong>Save</strong>)
                          </li>
                        </ul>
                      </li>
                    </ol>
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

// This has to be us-east-1 because the CF template only works in us-east-1 because ACM certs for CF only work in us-east-1
const suggestedRegion = 'us-east-1';

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
