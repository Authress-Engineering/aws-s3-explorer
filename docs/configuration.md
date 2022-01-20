# Custom Configuration
The S3 Explorer supports setting a default configuration that will be shared among all users that log into the Explorer via a custom domain.

To set the configuration navigate to the explorer S3 bucket created by the cloudformation template. The bucket should be called `s3-explorer.${AWS::AccountId}.${AWS::Region}`.

1. Upload a file called `configuration/shared.json`.
2. Then set the configuration as you would like, this should be a json file that looks as the following:

```json
{
    "buckets": ["BUCKET_1", "BUCKET_2"]
}
```

### "buckets"
This is a list of default buckets that every user should see when the login in additional to their manually configured buckets.