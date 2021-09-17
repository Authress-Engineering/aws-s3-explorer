# AWS S3 Explorer

<p align="center">
    <a href="./LICENSE" alt="apache 2.0 license">
      <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg">
    </a>
    <a href="https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/create/app?applicationId=arn:aws:serverlessrepo:eu-west-1:922723803004:applications/S3-Explorer" alt="Installations">
      <img src="https://img.shields.io/badge/Installed%20Deployments-8.1k-success">
    </a>
    <a href="https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/create/app?applicationId=arn:aws:serverlessrepo:eu-west-1:922723803004:applications/S3-Explorer" alt="AWS Serverless Application">
        <img src="https://img.shields.io/badge/AWS%20Serverless%20Application-S3%20Explorer-blue">
    </a>
</p>


This is an S3 Explorer for AWS. It provides a simple and straightforward way for users to login using SSO and explore available S3 Buckets. Everything is done in the browser and requires only minimal setup using either [AWS Cognito](https://) or [Authress](https://authress.io).

Rhosys hosts an explorer to use out of the box for the community. For obvious security reasons, this is a UI only tool, and makes ZERO api calls to anywhere other than AWS. The following is a link to that explorer. However, if for some reason, other than security there is a benefit to hosting a clone of this, feel free to fork the repo and make any necessary changes. Alternatively, please contribute!
## Go to the => [AWS S3 Explorer](https://rhosys.github.io/aws-s3-explorer/)

![Folder selected screen](screenshots/explorer-folder.png)

## The only setup step
Jump over to the [AWS S3 explorer configuration](https://rhosys.github.io/aws-s3-explorer) to deploy the Cognito CFN template, and configure your SSO provider. That's it!

<!-- ## Display Options

This application allows visitors to view the contents of a bucket via its folders or by listing out all objects in a bucket. The default view is by folder, but users can choose Initial View: Bucket in Settings to display all objects in the bucket. Note that viewing an entire bucket that contains many objects could overwhelm the browser. We've successfully tested this application on a bucket with over 30,000 objects, but keep in mind that trying to list too many objects in a browser could lead to a poor user experience. -->

## Screenshots

View all objects in folder:
![Folder selected screen](screenshots/explorer-folder.png)

View all objects in bucket:
![Bucket traversal screen](screenshots/explorer-bucket.png)

Upload objects to a bucket:
![Bucket upload request screen](screenshots/explorer-upload.png)

Upload objects to a bucket succeeded:
![Bucket upload confirmation screen](screenshots/explorer-upload-success.png)

Delete objects from a bucket:
![Bucket object delete request screen](screenshots/explorer-delete.png)

Delete objects from a bucket succeeded:
![Bucket object delete confirmation screen](screenshots/explorer-delete-success.png)

## Contribution

### Development
This project uses Vue 3, and as this is much different from Vue 2, recommend reading is available:
* [General Updates](https://v3.vuejs.org/guide/computed.html)
* [Script Setup tags](https://v3.vuejs.org/api/sfc-script-setup.html)