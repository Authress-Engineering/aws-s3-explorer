<template>
  <div>
    <div class="modal-dialog">
      <div class="modal-content">
        <form name="settings_form">
          <div>
            <div class="modal-header">
              <h4 class="modal-title">S3 Explorer: Settings</h4>
            </div>
            <div class="modal-body">
              <div class="col-md-18">
                <h2>Welcome to the AWS S3 Explorer</h2>
                <div class="" style="width: 100%;">
                  <div>
                    Specify the Cognito User Pool login url and clientId
                  </div>
                  <div style="display: flex; flex-direction: row; justify-content: space-around">
                    <input name="Login Domain URL" v-model="store.applicationLoginUrl" type="text" class="form-control" placeholder="https://domain.auth.eu-west-1.amazoncognito.com" required="true" style="margin-right: 1rem" />
                    <input name="Application Client ID" v-model="store.applicationClientId" type="text" class="form-control" placeholder="4altof0dlefqqicdifb8tv4mjp" required="true" style="margin-right: 1rem" />
                    <button type="submit" class="btn btn-primary" :disabled="!store.applicationLoginUrl || !store.applicationClientId" @click="cognitoLogin"><i class='fas fa-sign-in-alt'></i> Login</button>
                  </div>
                  <hr>
                  
                  <div>
                    <h4>Setup Cognito SSO Login</h4>
                    Or setup up a cognito pool and configure the explorer.
                    <ol>
                      <li>
                        Cognito User Pool:
                          <ul>
                            <li>Create a User Pool in any region (Not an identity pool)</li>
                            <li>Since we will use SSO, most of the configuration is irrelevant</li>
                            <li><strong>General settings > App clients</strong> > Add the S3 Console as an app</li>
                            <li><strong>Federation > Identity providers</strong> > Add your SSO provider of choice to the OAuth settings</li>
                            <li><strong>App Integration > App client settings</strong> > Enable identity provider just created</li>
                            <li>Specify <strong>https://rhosys.github.io/aws-s3-explorer/</strong> as the callback and logout urls</li>
                            <li>Specify <strong>Authorization code grant</strong> flow and enable All <strong>Allowed OAuth Scopes</strong></li>
                            <li><strong>App Integration > Domain name</strong> > Configure the setup for a domain (either Cognito or your own custom one.</li>
                          </ul>
                      </li>
                      <li>Return here and enter the Cognito user pool login URL and ID above.</li>
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

                <!-- <p><b>Bucket</b>: Please indicate which region and S3 bucket you want to explore.</p> -->
                
              </div>
            </div>
            <!-- <div class="modal-footer">
              <div class="form-group">
                <div class="col-sm-offset-2 col-sm-10">
                  <button type="button" class="btn btn-default" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-primary" @click="update"><i class='fa fa-cloud-download-alt fa-lg'></i>&nbsp;Query S3</button>
                </div>
              </div>
            </div> -->
          </div>
        </form>
      </div>
    </div>
  </div>
</template>


<script setup>
import { reactive, onMounted } from 'vue'
import { DateTime } from 'luxon';
import DEBUG from '../logger';
import store from '../store';
import jwtManager from '../jwtManager';

const state = reactive({ region: null });

const sha256 = async (str) => {
	return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
};

const generateNonce = async () => {
	const hash = await sha256(crypto.getRandomValues(new Uint32Array(4)).toString());
	// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
	const hashArray = Array.from(new Uint8Array(hash));
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

const base64URLEncode = (string) => {
	return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")
};

const searchParams = new URL(location).searchParams;

const cognitoLogin = async () => {
  console.log('****', jwtManager.decode(store.tokens.access_token));
  if (store.tokens && DateTime.fromSeconds(jwtManager.decode(store.tokens.access_token).exp) > DateTime.utc()) {
    store.showSettings = false;
    return;
  }

  const code = searchParams.get("code");
  if (code !== null) {
    // remove the query parameters
    // window.history.replaceState({}, document.title, '/');
    const nonce = searchParams.get("state");
    const codeVerifier = localStorage.getItem('codeVerifier');
    if (codeVerifier === null) {
      throw new Error("Unexpected code");
    }

    const codeExchangeBody = Object.entries({
      "grant_type": "authorization_code",
      "client_id": store.applicationClientId,
      "code": searchParams.get("code"),
      "code_verifier": codeVerifier,
      "redirect_uri": `${window.location.origin}${window.location.pathname}`,
    }).map(([k, v]) => `${k}=${v}`).join("&");
    console.log('****', codeExchangeBody);

    const res = await fetch(`${store.applicationLoginUrl}/oauth2/token`, {
      method: "POST",
      headers: new Headers({"content-type": "application/x-www-form-urlencoded"}),
      body: codeExchangeBody
    });
    if (!res.ok) {
      throw new Error(await res.json());
    }
    const tokens = await res.json();
    store.tokens = tokens;
    return;
  }

  if (!store.applicationLoginUrl || !store.applicationClientId) {
    return;
  }

  try {
      new URL(store.applicationLoginUrl);
    } catch (error) {
      return;
    }

  // otherwise redirect login
  const nonce = await generateNonce();
	const codeVerifier = await generateNonce();
	localStorage.setItem('codeVerifier', codeVerifier);
	const codeChallenge = base64URLEncode(await sha256(codeVerifier));
	// redirect to login
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
	window.location = `${store.applicationLoginUrl}/oauth2/authorize?response_type=code&client_id=${store.applicationClientId}&state=${nonce}&code_challenge_method=S256&code_challenge=${codeChallenge}&redirect_uri=${redirectUri}`;
};

onMounted(() => cognitoLogin());
</script>