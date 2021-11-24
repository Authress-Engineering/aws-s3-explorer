/* eslint-disable no-console */
const { config, S3, ACM, Route53 } = require('aws-sdk');
const cloudFormation = require('cfn-response');

// http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html
let logStreamName;
async function sendEvent(event, success, data, resourceId) {
  await new Promise(resolve => {
    cloudFormation.send(event, { logStreamName, done: resolve }, success ? cloudFormation.SUCCESS : cloudFormation.FAILED, data, resourceId);
  });
}

exports.handler = async function(event, context) {
  logStreamName = `${context.logGroupName}: ${context.logStreamName}`;

  try {
    if (event.ResourceProperties.Type === 'BUCKET') {
      await handleBucketObject(event);
      return;
    }

    if (event.ResourceProperties.Type === 'CERTIFICATE') {
      await handleCertificate(event);
      return;
    }

    if (event.ResourceProperties.Type === 'CERTIFICATE_VERIFIER') {
      await waitForCertificate(event);
      return;
    }
  } catch (error) {
    await sendEvent(event, false, { title: 'Failed to handle custom resource:', event, context, error: error.message || error.toString() || error });
  }
};

async function handleBucketObject(event) {
  const bucketName = event.ResourceProperties.BucketName;
  const s3client = new S3();

  if (event.RequestType === 'Delete') {
    try {
      await s3client.deleteObject({ Bucket: bucketName, Key: 'configuration.json' }).promise();
      await sendEvent(event, true, { title: 'Configuration Deleted' }, `${bucketName}/configuration.json`);
    } catch (error) {
      await sendEvent(event, true,
        { title: 'Failed to delete configuration, failing gracefully.', event, bucketName, error: error.message || error.toString() || error }, `${bucketName}/configuration.json`);
    }
    return;
  }

  try {
    await s3client.putObject({
      Bucket: bucketName,
      Key: 'configuration.json',
      Body: Buffer.from(JSON.stringify({
        cognitoPoolId: event.ResourceProperties.CognitoPoolId,
        applicationLoginUrl: event.ResourceProperties.LoginUrl,
        applicationClientId: event.ResourceProperties.ApplicationClientId,
        identityPoolId: event.ResourceProperties.IdentityPoolId,
        awsAccountId: event.ResourceProperties.AwsAccountId,
        customDomain: event.ResourceProperties.CustomDomain,
        region: config.region
      })),
      ContentType: 'application/json' }).promise();
    await sendEvent(event, true, { title: 'Configuration updated' }, `${bucketName}/configuration.json`);
  } catch (error) {
    await sendEvent(event, false, { title: 'Failed to write configuration', event, bucketName, error: error.message || error.toString() || error }, `${bucketName}/configuration.json`);
  }
}

async function handleCertificate(event) {
  const customDomain = event.ResourceProperties.CustomDomain;
  const acmClient = new ACM({ region: 'us-east-1' });
  const route53Client = new Route53();

  if (event.RequestType === 'Delete') {
    await sendEvent(event, true, { }, customDomain);
    return;
  }

  let hostedZoneId;
  const dnsLength = customDomain.split('.').length;
  for (let pathSegmentCount = 0; !hostedZoneId && pathSegmentCount < dnsLength; pathSegmentCount++) {
    const result = await route53Client.listHostedZonesByName({ DNSName: customDomain.split('.').slice(pathSegmentCount, dnsLength).join('.') }).promise();
    hostedZoneId = result.HostedZones[0] && result.HostedZones[0].Id.split('/')[2];
  }
  
  // we need to try finding the pending certificate, but we don't know when it's available
  // so we try immediately, and then wait for 10 seconds until we find it, for a maximum
  // of 10 tries.
  for (let attemptNumber = 0; attemptNumber < 10; attemptNumber++) {
    // list all certificates that are still in a pending state
    // and filter by those that match the certificate name
    const certificatesResult = await acmClient.listCertificates({ CertificateStatuses: ['PENDING_VALIDATION', 'ISSUED'], MaxItems: 1000 }).promise();
    let certificate = certificatesResult.CertificateSummaryList.find(c => c.DomainName === customDomain);

    if (!certificate && !attemptNumber) {
      const params = {
        DomainName: customDomain,
        IdempotencyToken: customDomain.replace(/[^\w]/g, ''),
        ValidationMethod: 'DNS',
        Tags: [
          { Key: 'Name', Value: 'S3 Explorer' },
          { Key: 'Service', Value: 'S3 Explorer' }
        ]
      };
      certificate = await acmClient.requestCertificate(params).promise();
    }

    // wait 10 seconds until we try again to retrieve the newly created certificate
    if (!certificate) {
      console.log(JSON.stringify({ title: 'No certificate found. Trying again in 10 seconds.', numberOfTry: attemptNumber }));
      await new Promise(resolve => setTimeout(resolve, 1000 * 20));
      continue;
    }

    // retrieve the certificate details, which includes the domain validation details
    const validationData = await acmClient.describeCertificate({ CertificateArn: certificate.CertificateArn }).promise();
    console.log(JSON.stringify({ title: 'Certificate request validation data:', validationData }));

    // return the validation options, which can be used as input to the generated Route53 entry
    // those might not be available immediately, so we need to check for those, and otherwise
    // try again in 10 seconds
    if (validationData.Certificate
    && validationData.Certificate.DomainValidationOptions
    && validationData.Certificate.DomainValidationOptions.length > 0
    && validationData.Certificate.DomainValidationOptions[0].ResourceRecord) {
      const result = {
        HostedZoneId: hostedZoneId,
        Name: validationData.Certificate.DomainValidationOptions[0].ResourceRecord.Name,
        Value: validationData.Certificate.DomainValidationOptions[0].ResourceRecord.Value,
        Arn: certificate.CertificateArn
      };

      // find the hosted zone and create the validation record
      await sendEvent(event, true, result, certificate.CertificateArn);
      return;
    }

    console.log(JSON.stringify({ title: 'Certificate found, but validation option not yet available. Trying again in 10 seconds.', numberOfTry: attemptNumber }));
    await new Promise(resolve => setTimeout(resolve, 1000 * 20));
  }

  await sendEvent(event, false, { title: 'No certificate exists for domain.', event, customDomain }, customDomain);
}

async function waitForCertificate(event) {
  const certificateArn = event.ResourceProperties.CertificateArn;
  const acmClient = new ACM({ region: 'us-east-1' });

  if (event.RequestType === 'Delete') {
    await sendEvent(event, true, {}, certificateArn);
    return;
  }

  for (let attemptNumber = 0; attemptNumber < 150; attemptNumber++) {
    let validationData;
    try {
      console.log(JSON.stringify({ title: 'Waiting for certificate to become verified.', certificateArn }));
      validationData = await acmClient.describeCertificate({ CertificateArn: certificateArn }).promise();
    } catch (error) {
      console.warn(JSON.stringify({ title: 'Failed to fetch certificate, retrying', event, certificateArn, error }));
      continue;
    }
    if (validationData.Certificate
    && validationData.Certificate.DomainValidationOptions
    && validationData.Certificate.DomainValidationOptions.length > 0
    && validationData.Certificate.DomainValidationOptions[0].ResourceRecord
    && validationData.Certificate.DomainValidationOptions[0].ValidationStatus === 'SUCCESS') {
      await sendEvent(event, true, { title: 'Certificate verified.', certificateArn }, certificateArn);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000 * 5));
  }

  await sendEvent(event, false, { title: 'Certificate failed to be verified', event, certificateArn }, certificateArn);
}
