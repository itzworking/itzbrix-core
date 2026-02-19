# itzbrix-core

Stateful infrastructure for [ITzBrix](../README.md) — AWS CDK stacks defining DynamoDB tables, S3 buckets, Cognito user pools, domain management, and Amplify web apps.

Part of a 3-repo project: **itzbrix-core** (this — infra) · `itzbrix-platform` (API) · `itzbrix-www` (frontend).

## Setup

```bash
npm install
```

Requires AWS credentials configured and SSM parameters initialized (see `scripts/init-ssm.mjs`).

## Commands

```bash
npx tsc --noEmit     # Type-check
npx eslint .         # Lint
make deploy:all      # Deploy all stacks
```

## Stacks

| Stack                     | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `DomainStack`             | Route53 hosted zone, domain management     |
| `CoreStack`               | Cognito user pool, EventBridge event bus   |
| `StatefulStack`           | DynamoDB tables, S3 buckets                |
| `S3BucketsStatelessStack` | CloudFront distributions, ACM certificates |
| `WebappsStatelessStack`   | Amplify apps, Cognito user pool clients    |

## Tech

- AWS CDK (TypeScript)
- [ITzWorking framework](https://itzworking.com) (`@itzworking/*` packages)
