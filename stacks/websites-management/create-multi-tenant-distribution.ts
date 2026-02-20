import { Configurations } from "@itzworking/cdk";
import { Duration } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import { createViewerRequestLambda } from "./create-viewer-request-lambda";
import { WebsitesManagementStateful } from "./websites-management-stateful";

export const createMultiTenantDistribution = (
  scope: WebsitesManagementStateful,
  props: {
    websitesBucket: s3.IBucket;
    configurations: Configurations;
    globalResourceScope: Construct;
  },
) => {
  const viewerRequestLambda = createViewerRequestLambda(scope);

  const websiteDomainsConfigurations = (props.configurations.core as any)
    ?.websiteDomains;
  const hostedZoneDomainName: string =
    websiteDomainsConfigurations?.live?.default?.hostedZoneDomainName;
  const domainName: string =
    websiteDomainsConfigurations?.live?.default?.domainName;

  const hostedZone = route53.HostedZone.fromLookup(
    scope,
    "MultiTenantHostedZone",
    {
      domainName: hostedZoneDomainName,
    },
  );

  const oac = new cloudfront.S3OriginAccessControl(
    scope,
    "MultiTenantWebsitesBucketOAC",
    {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    },
  );
  const certificate = new acm.Certificate(
    props.globalResourceScope,
    "MultiTenantCertificate",
    {
      domainName: `*.${domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    },
  );

  const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
    scope,
    "WebsitesResponseHeadersPolicy",
    {
      comment: "CORS and security headers for websites",
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ["*"],
        accessControlAllowMethods: ["GET", "HEAD", "OPTIONS"],
        accessControlAllowOrigins: ["*"],
        accessControlExposeHeaders: ["*"],
        accessControlMaxAge: Duration.seconds(600),
        originOverride: true,
      },
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(31536000),
          includeSubdomains: true,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
      },
    },
  );

  // Create the multi-tenant distribution using L1 construct
  return new cloudfront.CfnDistribution(scope, "MultiTenantDistribution", {
    distributionConfig: {
      comment: "Multi-tenant distribution for websites",
      enabled: true,
      httpVersion: "http2and3",

      // Set connection mode to tenant-only for multi-tenant support
      connectionMode: "tenant-only",

      // Define parameters that tenants can use
      tenantConfig: {
        parameterDefinitions: [
          {
            name: "websiteId",
            definition: {
              stringSchema: {
                comment: "Website ID for routing to correct S3 path",
                required: true,
              },
            },
          },
        ],
      },

      viewerCertificate: {
        acmCertificateArn: certificate.certificateArn,
        sslSupportMethod: "sni-only",
        minimumProtocolVersion: "TLSv1.2_2021",
      },

      // Define origins with parameterized path
      origins: [
        {
          id: "ITzBrixWebsitesS3Origin",
          domainName: props.websitesBucket.bucketRegionalDomainName,
          // Use parameter in origin path: /websites/{{websiteId}}/
          originPath: "/websites/{{websiteId}}",
          originAccessControlId: oac.originAccessControlId,
          s3OriginConfig: {
            originAccessIdentity: "",
          },
        },
      ],

      // Default cache behavior
      defaultCacheBehavior: {
        targetOriginId: "ITzBrixWebsitesS3Origin",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD"],
        compress: true,
        cachePolicyId: cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
        responseHeadersPolicyId: responseHeadersPolicy.responseHeadersPolicyId,
        lambdaFunctionAssociations: [
          {
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
            lambdaFunctionArn: viewerRequestLambda.currentVersion.functionArn,
            includeBody: false,
          },
        ],
      },

      // Custom error responses
      customErrorResponses: [
        {
          errorCode: 403,
          responseCode: 404,
          responsePagePath: "/not-found/index.html",
          errorCachingMinTtl: 300,
        },
        {
          errorCode: 404,
          responseCode: 404,
          responsePagePath: "/not-found/index.html",
          errorCachingMinTtl: 300,
        },
      ],

      // Default root object
      defaultRootObject: "index.html",
    },
  });
};
