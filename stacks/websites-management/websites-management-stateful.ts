import { StatefulStack, StatefulStackProps } from "@itzworking/cdk";
import { Duration, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { createMultiTenantDistribution } from "./create-multi-tenant-distribution";
import { createPreviewsDistribution } from "./create-previews-distribution";
import { createRevisionsDistribution } from "./create-revisions-distribution";

export class WebsitesManagementStateful extends StatefulStack {
  constructor(scope: Construct, id: string, props: StatefulStackProps) {
    super(scope, id, props);

    const websitesBucket = this.s3.addBucket("WebsitesBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      lifecycleRules: [
        {
          enabled: true,
          prefix: "assets/tmp/",
          expiration: Duration.days(1),
        },
        {
          enabled: true,
          prefix: "deleted/",
          expiration: Duration.days(30),
        },
      ],
    });

    websitesBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [websitesBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringLike: {
            "AWS:SourceArn": `arn:aws:cloudfront::${
              Stack.of(this).account
            }:distribution/*`,
          },
        },
      }),
    );

    const globalResourceScope = this.getGlobalResourceScope();
    const cfnDistribution = createMultiTenantDistribution(this, {
      websitesBucket,
      configurations: props.configurations,
      globalResourceScope,
    });
    // createAssetsDistribution(this, {
    //   websitesBucket,
    //   configurations: props.configurations,
    //   globalResourceScope,
    // });
    createPreviewsDistribution(this, {
      websitesBucket,
      configurations: props.configurations,
      globalResourceScope,
    });
    createRevisionsDistribution(this, {
      websitesBucket,
      configurations: props.configurations,
      globalResourceScope,
    });

    new ssm.StringParameter(this, "WebsitesMultiTenantDistributionIdParam", {
      parameterName:
        "/itz-brix/resources/ITzBrixWebsitesManagementStateful/cloudfront/distributions/MultiTenantDistribution/distribution-id",
      stringValue: cfnDistribution.distributionRef.distributionId || "",
    });

    new s3Deployment.BucketDeployment(
      this,
      "WebsitesBucketPreviewsRobotsDeployment",
      {
        sources: [s3Deployment.Source.asset(`${__dirname}/s3-sources/robots`)],
        destinationBucket: websitesBucket,
        destinationKeyPrefix: "previews",
        prune: false,
      },
    );

    new s3Deployment.BucketDeployment(
      this,
      "WebsitesBucketRevisionsRobotsDeployment",
      {
        sources: [s3Deployment.Source.asset(`${__dirname}/s3-sources/robots`)],
        destinationBucket: websitesBucket,
        destinationKeyPrefix: "revisions",
        prune: false,
      },
    );
  }
}
