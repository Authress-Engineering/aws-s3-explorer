/* eslint-disable no-console */

const axios = require('axios');
const aws = require('aws-sdk');
const commander = require('commander');
const fs = require('fs-extra');
// const path = require('path');
// const AwsArchitect = require('aws-architect');
// const githubActionsRunner = require('ci-build-tools')(process.env.GITHUB_TOKEN);

aws.config.update({ region: 'eu-west-1' });

async function setupAWS() {
  if (!process.env.GITHUB_TOKEN) { return; }
  try {
    const tokenResponse = await axios.post('https://login.rhosys.ch/api/authentication/github/tokens',
      { client_id: 'fZqy3XNgvtAcKonjfAu9WF', grant_type: 'client_credentials' },
      { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
    );

    aws.config.credentials = new aws.WebIdentityCredentials({
      WebIdentityToken: tokenResponse.data.access_token,
      RoleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/GitHubRunnerAssumedRole`,
      RoleSessionName: `GitHubRunner-${process.env.GITHUB_REPOSITORY}-${process.env.GITHUB_RUN_NUMBER}`,
      DurationSeconds: 3600
    });

    const stsResult = await new aws.STS().getCallerIdentity().promise();
    console.log('Configured AWS Credentials', stsResult);
  } catch (error) {
    console.log('Failed to setup credentials', error);
    // process.exit(1);
  }
}

function getVersion() {
  let release_version = '0.0';
  const pull_request = '';
  const branch = process.env.GITHUB_REF;
  const build_number = `${process.env.GITHUB_RUN_NUMBER}`;

  // Builds of pull requests
  if (pull_request && !pull_request.match(/false/i)) {
    release_version = `0.${pull_request}`;
  } else if (!branch || !branch.match(/^(refs\/heads\/)?release[/-]/i)) {
    // Builds of branches that aren't master or release
    release_version = '0.0';
  } else {
    // Builds of release branches (or locally or on server)
    release_version = branch.match(/^(?:refs\/heads\/)?release[/-](\d+(?:\.\d+){0,3})$/i)[1];
  }
  return `${release_version}.${(build_number || '0')}.0.0.0.0`.split('.').slice(0, 3).join('.');
}
const version = getVersion();
commander.version(version);

/**
  * Build
  */
commander
  .command('setup')
  .description('Setup require build files for npm package.')
  .action(async () => {
    const package_metadata = require('./package.json');
    package_metadata.version = version;
    await fs.writeJson('./package.json', package_metadata, { spaces: 2 });

    console.log('Building package %s (%s)', package_metadata.name, version);
    console.log('');
  });

/**
  * After Build
  */
commander
  .command('after_build')
  .description('Publishes git tags and reports failures.')
  .action(async () => {
    const package_metadata = require('./package.json');
    console.log('After build package %s (%s)', package_metadata.name, version);
    console.log('');
    // githubActionsRunner.MergeDownstream('release/', 'main');
    await setupAWS();

    // const apiOptions = {
    //   deploymentBucket: 's3-explorer-public-data'
    // };
    
    // const contentOptions = {
    //   bucket: 's3-explorer-public-data',
    //   contentDirectory: path.join(__dirname, 'template')
    // };
    // const publishConfig = {
    //   configureBucket: false,
    //   cacheControlRegexMap: [
    //     { value: 'public, max-age=86400' }
    //   ]
    // };
    // const result = await new AwsArchitect(packageMetadata, apiOptions, contentOptions).publishWebsite(null, publishConfig);
    // console.log('Publish Result', result);
  });

commander.on('*', () => {
  if (commander.args.join(' ') === 'tests/**/*.js') { return; }
  console.log(`Unknown Command: ${commander.args.join(' ')}`);
  commander.help();
  process.exit(0);
});
commander.parse(process.argv[2] ? process.argv : process.argv.concat(['build']));
