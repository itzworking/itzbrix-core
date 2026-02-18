import { Configurations, S3Construct } from "@itzworking/cdk";
import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

const getDomainNames = (domainName: string) => {
  return {
    publicBucketDomainName: `cdn.${domainName}`,
    privateBucketDomainName: `storage.${domainName}`,
  };
};

interface S3BucketsProps {
  configurations: Configurations;
  s3Construct: S3Construct;
}

/**
 * CDK Construct that creates and manages two S3 buckets with CloudFront distributions.
 *
 * Creates:
 * - **Public Bucket**: Optimized for CDN delivery with caching, CORS, and CloudFront OAC
 *   - Accessible via `cdn.{domain}` subdomain
 *   - Image-optimized caching with 1-year max-age
 *   - Lifecycle rules: 1-day expiration for tmp/, 30-day for deleted/
 *
 * - **Private Bucket**: For authenticated/private storage with minimal caching
 *   - Accessible via `storage.{domain}` subdomain
 *   - Caching disabled for private content
 *   - Same lifecycle rules as public bucket
 *
 * Both buckets have CORS enabled and block public access by default.
 * Use `setupS3Distributions()` to configure CloudFront distributions and Route53 records.
 */
export class ITzS3Buckets extends Construct {
  readonly privateBucketArn: string;
  readonly publicBucketArn: string;

  constructor(scope: Construct, id: string, props: S3BucketsProps) {
    super(scope, id);

    const cors = [
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
    ];

    const publicBucket = props.s3Construct.addBucket("PublicBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors,
      lifecycleRules: [
        {
          enabled: true,
          prefix: "tmp/",
          expiration: Duration.days(1),
        },
        {
          enabled: true,
          prefix: "deleted/",
          expiration: Duration.days(30),
        },
      ],
    });
    this.publicBucketArn = publicBucket.bucketArn;

    publicBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [publicBucket.arnForObjects("*")],
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

    const privateBucket = props.s3Construct.addBucket("PrivateBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors,
      lifecycleRules: [
        {
          enabled: true,
          prefix: "tmp/",
          expiration: Duration.days(1),
        },
        {
          enabled: true,
          prefix: "deleted/",
          expiration: Duration.days(30),
        },
      ],
    });
    this.privateBucketArn = privateBucket.bucketArn;
  }

  static setupS3Distributions(
    scope: Construct,
    props: {
      s3Buckets: ITzS3Buckets | undefined;
      hostedZone: route53.IHostedZone;
      certificate: acm.ICertificate;
      domainName: string;
    },
  ) {
    const { s3Buckets, hostedZone, certificate, domainName } = props;
    if (!s3Buckets) return;

    const { publicBucketDomainName, privateBucketDomainName } =
      getDomainNames(domainName);

    const publicBucket = s3.Bucket.fromBucketArn(
      scope,
      "PublicBucket",
      s3Buckets.publicBucketArn,
    );

    const privateBucket = s3.Bucket.fromBucketArn(
      scope,
      "PrivateBucket",
      s3Buckets.privateBucketArn,
    );

    const cloudFrontOac = new cloudfront.S3OriginAccessControl(
      scope,
      "PublicBucketOAC",
      {
        signing: cloudfront.Signing.SIGV4_ALWAYS,
      },
    );

    const simpleCORSWithCacheControlResponseHeadersPolicy =
      new cloudfront.ResponseHeadersPolicy(
        scope,
        "SimpleCORSWithCacheControlResponseHeadersPolicy",
        {
          // responseHeadersPolicyName: "SimpleCORSWithCacheControl",
          comment:
            "Allows all origins for simple CORS requests with Cache-Control header",
          corsBehavior: {
            accessControlAllowCredentials: false,
            accessControlAllowHeaders: ["*"],
            accessControlAllowMethods: ["GET", "HEAD", "OPTIONS"],
            accessControlAllowOrigins: ["*"],
            accessControlExposeHeaders: ["*"],
            accessControlMaxAge: Duration.seconds(600),
            originOverride: true,
          },
          customHeadersBehavior: {
            customHeaders: [
              {
                header: "Cache-Control",
                value: "public,max-age=31536000",
                override: true,
              },
            ],
          },
        },
      );

    const imageExtensions = [
      "*.jpg",
      "*.jpeg",
      "*.png",
      "*.webp",
      "*.svg",
      "*.gif",
      "*.avif",
    ];
    const createImageBehavior = (): cloudfront.BehaviorOptions => ({
      origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(
        publicBucket,
        {
          originAccessControl: cloudFrontOac,
        },
      ),
      compress: true,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: simpleCORSWithCacheControlResponseHeadersPolicy,
    });

    // Build additional behaviors for all image extensions
    const imageBehaviors = imageExtensions.reduce(
      (acc, ext) => {
        acc[ext] = createImageBehavior();
        return acc;
      },
      {} as Record<string, cloudfront.BehaviorOptions>,
    );

    const publicBucketDistribution = new cloudfront.Distribution(
      scope,
      "PublicBucketDistribution",
      {
        comment: `Public bucket: ${publicBucketDomainName}`,
        certificate,
        domainNames: [publicBucketDomainName],
        defaultBehavior: {
          origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(
            publicBucket,
            {
              originAccessControl: cloudFrontOac,
            },
          ),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        additionalBehaviors: imageBehaviors,
      },
    );

    new CfnOutput(scope, "PublicBucketDistributionIdCfnOutput", {
      key: "PublicBucketDistributionId",
      value: publicBucketDistribution.distributionId,
    });

    new route53.ARecord(scope, "PublicBucketDistributionAliasRecord", {
      recordName: publicBucketDomainName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(publicBucketDistribution),
      ),
      zone: hostedZone,
    });

    const privateBucketDistribution = new cloudfront.Distribution(
      scope,
      "PrivateBucketDistribution",
      {
        comment: `Private bucket: ${privateBucketDomainName}`,
        certificate,
        domainNames: [privateBucketDomainName],
        defaultBehavior: {
          origin:
            cloudfrontOrigins.S3BucketOrigin.withBucketDefaults(privateBucket),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
    );

    new route53.ARecord(scope, "PrivateBucketDistributionAliasRecord", {
      recordName: privateBucketDomainName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(privateBucketDistribution),
      ),
      zone: hostedZone,
    });

    return {
      publicBucket,
      publicBucketDistribution,
      privateBucket,
      privateBucketDistribution,
    };
  }
}
