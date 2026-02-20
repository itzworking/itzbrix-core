#!/usr/bin/env node
import { loadConfigurations } from "@itzworking/cdk";
import * as cdk from "aws-cdk-lib";

import { CoreStack } from "../stacks/core";
import { DomainStack } from "../stacks/domain";
import { S3BucketsStatelessStack } from "../stacks/s3-buckets-stateless";
import { StatefulStack } from "../stacks/stateful";
import { WebappsStatelessStack } from "../stacks/webapps-stateless";
import { WebsitesManagementStateful } from "../stacks/websites-management/websites-management-stateful";

(async () => {
  const applicationName = "ITzBrix";
  const configurations = await loadConfigurations(applicationName);

  const app = new cdk.App();

  const region =
    process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION;
  const env = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region,
  };

  const domainStack = new DomainStack(app, `${applicationName}Domain`, {
    env,
    configurations,
    crossRegionReferences: region !== "us-east-1",
  });

  const coreStack = new CoreStack(app, `${applicationName}Core`, {
    description:
      "Core stack: shared infrastructure and core services for the application (e.g., Event Bus, Cognito, ...)",
    env,
    configurations,
    crossRegionReferences: true,
  });

  const stateful = new StatefulStack(app, `${applicationName}Stateful`, {
    description: "Stateful services (e.g., S3, DynamoDB, ...)",
    env,
    configurations,
    core: coreStack,
  });
  stateful.addDependency(coreStack);

  const s3BucketsStateless = new S3BucketsStatelessStack(
    app,
    `${applicationName}S3BucketsStateless`,
    {
      description: "S3Buckets: stateless services",
      env,
      configurations,
      useExperimentalImport: true,
      s3Buckets: stateful.s3Buckets, // Passed as prop (instead of auto-import) to enforce cross-stack dependency with Stateful
      crossRegionReferences: region !== "us-east-1",
    },
  );
  s3BucketsStateless.addDependency(coreStack);
  s3BucketsStateless.addDependency(stateful);
  s3BucketsStateless.addDependency(domainStack);

  const webappsStateless = new WebappsStatelessStack(
    app,
    `${applicationName}WebappsStateless`,
    {
      description: "Web apps infrastructure and configurations",
      env,
      configurations,
      core: coreStack,
      domain: domainStack,
      crossRegionReferences: region !== "us-east-1",
    },
  );
  webappsStateless.addDependency(coreStack);
  webappsStateless.addDependency(domainStack);

  const websitesManagementStateful = new WebsitesManagementStateful(
    app,
    `${applicationName}WebsitesManagementStateful`,
    {
      description:
        "Websites Management: S3 storage, CloudFront distributions and Lambda@Edge for multi-tenant website hosting",
      env,
      configurations,
      core: coreStack,
      crossRegionReferences: region !== "us-east-1",
    },
  );
  websitesManagementStateful.addDependency(coreStack);
})();
