#!/usr/bin/env bash

node make.js test-setup

aws --no-cli-auto-prompt cloudformation --region us-east-1 --profile PROFILE deploy --stack-name s3-test --template-file template/cloudformationTemplate.json --capabilities CAPABILITY_NAMED_IAM --parameter-overrides CustomDomain=CUSTOM_DOMANE