import { Configurations } from "@itzworking/cdk";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import { WebsitesManagementStateful } from "./websites-management-stateful";

export const createRevisionsDistribution = (
  scope: WebsitesManagementStateful,
  props: {
    configurations: Configurations;
    websitesBucket: s3.IBucket;
    globalResourceScope: Construct;
  },
) => {
  const websiteDomainsConfigurations = (props.configurations.core as any)
    ?.websiteDomains;
  const hostedZoneDomainName: string =
    websiteDomainsConfigurations?.revisions?.default?.hostedZoneDomainName;
  const domainName: string =
    websiteDomainsConfigurations?.revisions?.default?.domainName;

  const hostedZone = route53.HostedZone.fromLookup(
    scope,
    "RevisionsHostedZone",
    {
      domainName: hostedZoneDomainName,
    },
  );

  const oac = new cloudfront.S3OriginAccessControl(
    scope,
    "RevisionsBucketOAC",
    {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    },
  );
  const certificate = new acm.Certificate(
    props.globalResourceScope,
    "RevisionsCertificate",
    {
      domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    },
  );

  const websiteRevisionsDistribution = new cloudfront.Distribution(
    scope,
    "RevisionsDistribution",
    {
      comment: "Website revisions",
      certificate,
      domainNames: [domainName],
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(
          props.websitesBucket,
          {
            originAccessControl: oac,
            originPath: "/revisions",
          },
        ),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // functionAssociations: [
        //   {
        //     eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        //     function: refererCheckFunction,
        //   },
        // ],
      },
    },
  );

  new route53.ARecord(scope, "RevisionsDistributionAliasRecord", {
    recordName: domainName,
    target: route53.RecordTarget.fromAlias(
      new route53Targets.CloudFrontTarget(websiteRevisionsDistribution),
    ),
    zone: hostedZone,
  });
};
