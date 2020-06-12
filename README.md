# Serverless Hosted Zone Plugin

## Table of Contents

1. [Description](#description)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Using the Plugin](#using-the-plugin)
5. [Notes](#notes)
6. [License](#license)

## Description

This plugin allow you to call a CLI command to create and remove an AWS Route 53 hosted zone. This plugin is designed for the Serverless Framework 1.x.

## Requirements

- Serverless Framework 1.x.
- Node 10.x or greater.
- NPM 6.x or greater.

## Installation

### Installing the Serverless Framework

Visit the [Getting Started with the Serverless Framework](https://serverless.com/framework/docs/getting-started) to get started with the Serverless Framework.

Install with **npm**:

```sh
npm install -g serverless
```

### Installing the Plugin

Install with **npm**:

```sh
npm install --save-dev serverless-hosted-zone
```

And then add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-hosted-zone

custom:
  hostedZone:
    name: domain.com.
```

See the [example(s)](./examples).

## Using the Plugin

### Create a Route 53 Hosted Zone

Run the CLI command to create the hosted zone:

```sh
sls create-zone
```

### Create Route 53 Aliases

Update the `serverless.yml` file:

```yaml
custom:
  hostedZone:
    name: domain.com.
    aliases:
      - type: cloudfrontDistribution
        cname: api.domain.com.
```

Run the CLI command to create the alias for the hosted zone:

```sh
sls create-aliases
```

### Remove a Route 53 Hosted Zone

***<span style="color:red">Note: This feature is currently not supported.</span>***

Run the CLI command to create the hosted zone:

```sh
sls remove-zone
```

### Remove a Route 53 Aliases

***<span style="color:red">Note: This feature is currently not supported.</span>***

Run the CLI command to create the hosted zone:

```sh
sls remove-aliases
```

### Notes

Please request features or report problems using the [issues](https://github.com/miguel-a-calles-mba/serverless-hosted-zone/issues) page.

## IAM Policy

You may use this IAM policy as a starting point:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "route53:ListHostedZones",
        "cloudfront:ListDistributions"
      ],
      "Resource": "*",
      "Effect": "Allow",
      "Sid": "ServerlessHostedZonePlugin1"
    },
    {
      "Action": [
        "route53:CreateHostedZone",
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*",
      "Effect": "Allow",
      "Sid": "ServerlessHostedZonePlugin2"
    }
  ]
}
```

## License

See the included [LICENSE](LICENSE) for rights and limitations under the terms of the MIT license.
