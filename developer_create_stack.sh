#!/usr/bin/env bash
aws cloudformation --profile PROFILE deploy --stack-name s3-test --template-file template/cloudformationTemplate.json --capabilities CAPABILITY_NAMED_IAM