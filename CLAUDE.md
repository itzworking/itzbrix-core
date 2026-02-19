# CLAUDE.md

## Overview

**itzbrix-core** is the infrastructure foundation for ITzBrix — AWS CDK stacks defining stateful resources (DynamoDB, S3, Cognito) and cross-cutting infrastructure (domain, web apps).

Part of a 3-repo project: `itzbrix-core` (this — infra), `itzbrix-platform` (API), `itzbrix-www` (frontend).

## Commands

```bash
npx tsc --noEmit     # Type-check
npx eslint .         # Lint
make deploy:all      # Deploy all stacks
```

## Rules

- **NEVER touch the DomainStack** (`stacks/domain.ts`) — managed by humans only.
- **NEVER remove or rename stateful resources** (DynamoDB tables, S3 buckets, Cognito pools). Removal requires careful human handling due to cross-stack dependencies and data loss risk.
- **DynamoDB tables can be added** in `stacks/stateful.ts` via `this.dynamodb.addTable("TableName")`.
- **Do NOT create new S3 buckets** unless explicitly asked. There is a limit on S3 buckets per account. Use the existing `PublicBucket` or `PrivateBucket` instead.
- **Constructs are designed to be reusable across projects** — keep them generic, not project-specific.

## Stacks

Entry point: `bin/platform.ts`

| Stack                     | File                             | Purpose                                                   | Depends on             |
| ------------------------- | -------------------------------- | --------------------------------------------------------- | ---------------------- |
| `DomainStack`             | `stacks/domain.ts`               | Route53 hosted zone, domain management                    | —                      |
| `CoreStack`               | `stacks/core.ts`                 | Cognito user pool, EventBridge event bus                  | —                      |
| `StatefulStack`           | `stacks/stateful.ts`             | DynamoDB tables, S3 buckets                               | Core                   |
| `S3BucketsStatelessStack` | `stacks/s3-buckets-stateless.ts` | CloudFront distributions for S3 buckets, ACM certificates | Core, Stateful, Domain |
| `WebappsStatelessStack`   | `stacks/webapps-stateless.ts`    | Amplify apps, Cognito user pool clients                   | Core, Domain           |

### StatefulStack — current resources

**DynamoDB tables:**

- `MainTable` — main application data
- `UsersTable` — user data (service-users)
- `Emails` — email capability (service-senders)
- `WebsocketConnections` — WebSocket connection tracking (service-websockets)

**S3 buckets** (via `ITzS3Buckets` construct):

- `PublicBucket` — CDN-optimized via CloudFront (`cdn.{domain}`)
- `PrivateBucket` — secure storage via CloudFront (`storage.{domain}`)

## Custom Constructs

Located in `stacks/itz-constructs/`. These are **reusable across projects**.

| Construct              | Path              | Purpose                                                                          |
| ---------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `ITzUserPoolConstruct` | `itz-userpool/`   | Cognito user pool with MFA, Lambda triggers, KMS encryption                      |
| `ITzS3Buckets`         | `itz-s3-buckets/` | Public + private S3 buckets with lifecycle rules, CORS, CloudFront distributions |
| `ITzNextJSConstruct`   | `itz-nextjs/`     | Next.js hosting via AWS Amplify with GitHub CI/CD                                |

### Cognito Lambda Triggers

The user pool construct includes 4 Lambda triggers in `itz-userpool/lambdas/`:

| Trigger                             | File                      | Purpose                                                                |
| ----------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| CustomEmailSender / CustomSMSSender | `custom-sender.ts`        | Decrypts codes, publishes to EventBridge for custom email/SMS delivery |
| PostConfirmation                    | `post-confirmation.ts`    | Sets `preferred_username` on new users                                 |
| PreSignUp                           | `pre-sign-up.ts`          | Validates no duplicate emails, auto-confirms users                     |
| PreTokenGeneration                  | `pre-token-generation.ts` | Ensures `preferred_username` in token claims                           |

## SSM Parameters

Core configuration is stored in SSM Parameter Store (`scripts/init-ssm.mjs`):

| Parameter                         | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `/core/hosted-zone-domain-name`   | Route53 hosted zone domain                |
| `/core/domain-name`               | Application domain                        |
| `/core/environment-type`          | `development` / `production`              |
| `/core/removal-policy`            | CDK removal policy (`destroy` / `retain`) |
| `/core/log-level`                 | Lambda log level                          |
| `/core/log-retention-days`        | CloudWatch log retention                  |
| `/notifications/email/from-email` | SES sender email                          |

## General Rules

- **Do NOT commit, change branch, or create PRs unless explicitly asked**
- **Run `npx tsc --noEmit` + `npx eslint .` after finishing a task** to make sure nothing is broken
- **Install exact versions:** always use `npm install -E` (or `--save-exact`). No semver ranges.
- Prettier with double quotes
- ESLint flat config
- Pre-commit hook runs lint-staged (ESLint + Prettier)
- No tests currently — do not create test files unless explicitly asked
