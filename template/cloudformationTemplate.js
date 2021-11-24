module.exports = {
  getTemplate(lambdaFunctionString) {
    return {
      AWSTemplateFormatVersion: '2010-09-09',
      Transform: 'AWS::Serverless-2016-10-31',
      Description: 'S3 Explorer automation template',
      Parameters: {
        CustomDomain: {
          Type: 'String',
          Description: '[Optional] Deploys a white-labeled proxy to a custom domain. Do not include the prefix "https://". The default deployed location is https://console.rhosys.ch. [PATTERN: console.example.com]',
          Default: ''
        }
      },

      Conditions: {
        DeployCustomDomain: { 'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'CustomDomain' }, ''] }] }
      },

      Resources: {
        CognitoUserPool: {
          Type: 'AWS::Cognito::UserPool',
          Properties: {
            AccountRecoverySetting: {
              RecoveryMechanisms: [
                {
                  Name: 'admin_only',
                  Priority: 1
                }
              ]
            },
            AdminCreateUserConfig: {
              AllowAdminCreateUserOnly: true
            },
            DeviceConfiguration: {
              ChallengeRequiredOnNewDevice: false
            },
            Policies: {
              PasswordPolicy: {
                MinimumLength: 20,
                RequireLowercase: false,
                RequireNumbers: false,
                RequireSymbols: false,
                RequireUppercase: false,
                TemporaryPasswordValidityDays: 365
              }
            },
            UsernameConfiguration: {
              CaseSensitive: false
            },
            UserPoolName: 'S3 Explorer'
          }
        },

        S3ExplorerCognitoApplicationClient: {
          Type: 'AWS::Cognito::UserPoolClient',
          Properties: {
            AccessTokenValidity: 24,
            AllowedOAuthFlows: ['code'],
            AllowedOAuthFlowsUserPoolClient: true,
            AllowedOAuthScopes: ['phone', 'email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
            CallbackURLs: [
              { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}' }, 'https://console.rhosys.ch'] },
              { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}/' }, 'https://console.rhosys.ch/'] },
              'http://localhost:8080',
              'http://localhost:8080/',
              'https://console.rhosys.ch',
              'https://console.rhosys.ch/'
            ],
            ClientName: 'S3 Explorer UI',
            DefaultRedirectURI: { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}/' }, 'https://console.rhosys.ch/'] },
            EnableTokenRevocation: true,
            ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH'],
            GenerateSecret: false,
            IdTokenValidity: 24,
            LogoutURLs: [
              { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}' }, 'https://console.rhosys.ch'] },
              { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}/' }, 'https://console.rhosys.ch/'] },
              'http://localhost:8080',
              'http://localhost:8080/',
              'https://console.rhosys.ch',
              'https://console.rhosys.ch/'
            ],
            PreventUserExistenceErrors: 'ENABLED',
            RefreshTokenValidity: 3650,
            UserPoolId: { Ref: 'CognitoUserPool' },
            SupportedIdentityProviders: ['COGNITO']
          }
        },

        CognitoLoginUiConfiguration: {
          Type: 'AWS::Cognito::UserPoolDomain',
          Properties: {
            Domain: { 'Fn::Sub': '${AWS::AccountId}-s3explorer' },
            UserPoolId: { Ref: 'CognitoUserPool' }
          }
        },

        CognitoIdentityPool: {
          Type: 'AWS::Cognito::IdentityPool',
          Properties: {
            AllowUnauthenticatedIdentities: false,
            CognitoIdentityProviders: [
              {
                ClientId: { Ref: 'S3ExplorerCognitoApplicationClient' },
                ProviderName: { 'Fn::GetAtt': ['CognitoUserPool', 'ProviderName'] },
                ServerSideTokenCheck: false
              }
            ],
            IdentityPoolName: 'S3 Explorer'
          }
        },

        CognitoIdentityAuthenticatedRoleLink: {
          Type: 'AWS::Cognito::IdentityPoolRoleAttachment',
          Properties: {
            IdentityPoolId: { Ref: 'CognitoIdentityPool' },
            Roles: {
              authenticated: { 'Fn::GetAtt': ['AuthenticatedUserRoleForS3ExplorerUsers', 'Arn'] }
            }
          }
        },

        AuthenticatedUserRoleForS3ExplorerUsers: {
          Type: 'AWS::IAM::Role',
          Properties: {
            RoleName: { 'Fn::Sub': 'S3_Explorer_Authenticated_User-${AWS::Region}' },
            Path: '/',
            MaxSessionDuration: 43200,
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    Federated: 'cognito-identity.amazonaws.com'
                  },
                  Action: 'sts:AssumeRoleWithWebIdentity',
                  Condition: {
                    'StringEquals': {
                      'cognito-identity.amazonaws.com:aud': { Ref: 'CognitoIdentityPool' }
                    },
                    'ForAnyValue:StringLike': {
                      'cognito-identity.amazonaws.com:amr': 'authenticated'
                    }
                  }
                }
              ]
            },
            Policies: [
              {
                PolicyName: 'FullAccessToS3Buckets',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Sid: 'S3Access',
                      Effect: 'Allow',
                      Action: ['s3:*'],
                      Resource: ['*']
                    }
                  ]
                }
              }
            ]
          }
        },

        BucketForS3ExplorerSavedConfiguration: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: { 'Fn::Sub': 's3-explorer.${AWS::AccountId}.${AWS::Region}' },
            CorsConfiguration: {
              CorsRules: [
                {
                  AllowedHeaders: ['*'],
                  AllowedMethods: ['PUT', 'POST', 'DELETE', 'HEAD', 'GET'],
                  AllowedOrigins: [{ 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}' }, 'https://console.rhosys.ch'] }, 'https://console.rhosys.ch', 'http://localhost:8080'],
                  ExposedHeaders: ['x-amz-request-id'],
                  MaxAge: 3600
                }
              ]
            },
            Tags: [
              {
                Key: 'Service',
                Value: 'S3 Explorer Configuration'
              }
            ]
          }
        },

        S3BucketPolicy: {
          Type: 'AWS::S3::BucketPolicy',
          Properties: {
            Bucket: { Ref: 'BucketForS3ExplorerSavedConfiguration' },
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'Grant read access to S3 Explorer configuration.',
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 's3:GetObject',
                  Resource: { 'Fn::Sub': '${BucketForS3ExplorerSavedConfiguration.Arn}/*' }
                },
                {
                  Sid: 'Grant a CloudFront access to the configuration data',
                  Effect: 'Allow',
                  Principal: {
                    CanonicalUser: { 'Fn::GetAtt': ['CloudFrontOriginAccessIdentity', 'S3CanonicalUserId'] }
                  },
                  Action: 's3:GetObject',
                  Resource: { 'Fn::Sub': 'arn:aws:s3:::s3-explorer.${AWS::AccountId}.${AWS::Region}/*' }
                }
              ]
            }
          }
        },

        S3CustomResource: {
          Type: 'Custom::S3CustomResource',
          DependsOn: 'AWSLambdaExecutionRole',
          Properties: {
            ServiceToken: { 'Fn::GetAtt': ['AWSLambdaFunction', 'Arn'] },
            Type: 'BUCKET',
            BucketName: { Ref: 'BucketForS3ExplorerSavedConfiguration' },
            CognitoPoolId: { Ref: 'CognitoUserPool' },
            LoginUrl: { Ref: 'CognitoLoginUiConfiguration' },
            ApplicationClientId: { Ref: 'S3ExplorerCognitoApplicationClient' },
            IdentityPoolId: { Ref: 'CognitoIdentityPool' },
            AwsAccountId: { Ref: 'AWS::AccountId' },
            CustomDomain: { Ref: 'CustomDomain' }
          }
        },
        AWSLambdaFunction: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Description: 'Loads S3 Explorer Configuration into bucket',
            FunctionName: { 'Fn::Sub': '${AWS::StackName}-${AWS::Region}-lambda' },
            Handler: 'index.handler',
            Role: { 'Fn::GetAtt': ['AWSLambdaExecutionRole', 'Arn'] },
            Timeout: 900,
            Runtime: 'nodejs12.x',
            Code: {
              ZipFile: lambdaFunctionString
            }
          }
        },

        AWSLambdaExecutionRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Action: ['sts:AssumeRole'],
                  Effect: 'Allow',
                  Principal: {
                    Service: ['lambda.amazonaws.com']
                  }
                }
              ],
              Version: '2012-10-17'
            },
            Path: '/',
            Policies: [
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                      Effect: 'Allow',
                      Resource: 'arn:aws:logs:*:*:*'
                    }
                  ],
                  Version: '2012-10-17'
                },
                PolicyName: { 'Fn::Sub': '${AWS::StackName}-${AWS::Region}-AWSLambda-CW' }
              },
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Sid: 'S3Configuration',
                      Action: ['s3:PutObject', 's3:DeleteObject'],
                      Effect: 'Allow',
                      Resource: [{ 'Fn::Sub': '${BucketForS3ExplorerSavedConfiguration.Arn}/*' }]
                    },
                    {
                      Sid: 'CertificateManagement',
                      Action: ['acm:RequestCertificate', 'acm:DescribeCertificate', 'acm:ListCertificates', 'acm:AddTagsToCertificate', 'route53:ListHostedZonesByName'],
                      Effect: 'Allow',
                      Resource: '*'
                    }
                  ],
                  Version: '2012-10-17'
                },
                PolicyName: { 'Fn::Sub': '${AWS::StackName}-${AWS::Region}-AWSLambda' }
              }
            ],
            RoleName: { 'Fn::Sub': '${AWS::StackName}-${AWS::Region}-AWSLambdaExecutionRole' }
          }
        },

        Certificate: {
          Type: 'Custom::Certificate',
          Condition: 'DeployCustomDomain',
          DependsOn: 'AWSLambdaExecutionRole',
          Properties: {
            ServiceToken: { 'Fn::GetAtt': ['AWSLambdaFunction', 'Arn'] },
            Type: 'CERTIFICATE',
            CustomDomain: { Ref: 'CustomDomain' }
          }
        },

        CertificateValidation: {
          Type: 'AWS::Route53::RecordSet',
          Condition: 'DeployCustomDomain',
          Properties: {
            HostedZoneId: { 'Fn::Sub': '${Certificate.HostedZoneId}' },
            Name: { 'Fn::Sub': '${Certificate.Name}' },
            Type: 'CNAME',
            TTL: '60',
            ResourceRecords: [{ 'Fn::Sub': '${Certificate.Value}' }]
          }
        },

        CertificateVerifier: {
          Type: 'Custom::CertificateVerifier',
          DependsOn: 'CertificateValidation',
          Condition: 'DeployCustomDomain',
          Properties: {
            ServiceToken: { 'Fn::GetAtt': ['AWSLambdaFunction', 'Arn'] },
            Type: 'CERTIFICATE_VERIFIER',
            CertificateArn: { 'Fn::Sub': '${Certificate.Arn}' }
          }
        },

        CloudFrontDistribution: {
          Type: 'AWS::CloudFront::Distribution',
          Condition: 'DeployCustomDomain',
          DependsOn: 'CertificateVerifier',
          Properties: {
            DistributionConfig: {
              Comment: 'S3 Explorer UI',
              DefaultRootObject: 'index.html',
              Aliases: [{ 'Fn::Sub': '${CustomDomain}' }],
              HttpVersion: 'http2',
              PriceClass: 'PriceClass_All',
              Origins: [
                {
                  DomainName: { 'Fn::Sub': 'console.rhosys.ch' },
                  Id: 'DefaultConsole',
                  CustomOriginConfig: {
                    OriginProtocolPolicy: 'https-only',
                    OriginSSLProtocols: ['TLSv1.2']
                  }
                },
                {
                  DomainName: { 'Fn::Sub': '${BucketForS3ExplorerSavedConfiguration.DomainName}' },
                  Id: 'Configuration',
                  S3OriginConfig: {
                    OriginAccessIdentity: { 'Fn::Sub': 'origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}' }
                  }
                }
              ],
              Enabled: true,
              ViewerCertificate: {
                AcmCertificateArn: { 'Fn::Sub': '${Certificate.Arn}' },
                MinimumProtocolVersion: 'TLSv1.2_2021',
                SslSupportMethod: 'sni-only'
              },
              DefaultCacheBehavior: {
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
                Compress: true,
                CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                OriginRequestPolicyId: '59781a5b-3903-41f3-afcb-af62929ccde1',
                TargetOriginId: 'DefaultConsole',
                ViewerProtocolPolicy: 'redirect-to-https'
              },
              CacheBehaviors: [{
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                Compress: true,
                CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf',
                PathPattern: 'configuration*',
                TargetOriginId: 'Configuration',
                ViewerProtocolPolicy: 'redirect-to-https'
              }],
              CustomErrorResponses: [
                {
                  ErrorCode: 403,
                  ErrorCachingMinTTL: 300,
                  ResponseCode: 200,
                  ResponsePagePath: '/index.html'
                },
                {
                  ErrorCode: 404,
                  ErrorCachingMinTTL: 300,
                  ResponseCode: 200,
                  ResponsePagePath: '/index.html'
                }
              ]
            },
            Tags: [
              {
                Key: 'Service',
                Value: 'S3 Explorer Configuration'
              }
            ]
          }
        },

        CloudFrontOriginAccessIdentity: {
          Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
          Properties: {
            CloudFrontOriginAccessIdentityConfig: {
              Comment: 'S3 Explorer'
            }
          }
        },

        DomainName: {
          Type: 'AWS::Route53::RecordSet',
          Condition: 'DeployCustomDomain',
          Properties: {
            AliasTarget: {
              DNSName: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
              HostedZoneId: 'Z2FDTNDATAQYW2'
            },
            HostedZoneId: { 'Fn::Sub': '${Certificate.HostedZoneId}' },
            Name: { Ref: 'CustomDomain' },
            Type: 'A'
          }
        }
      },

      Outputs: {
        ConsoleUrl: {
          Description: "S3 Explorer deployed location, set using the 'CustomDomain' parameter. Defaults to: https://console.rhosys.ch",
          Value: { 'Fn::If': ['DeployCustomDomain', { 'Fn::Sub': 'https://${CustomDomain}' }, 'https://console.rhosys.ch'] }
        }
      }
    };
  }
};

