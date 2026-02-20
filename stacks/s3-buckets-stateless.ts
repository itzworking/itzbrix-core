import { StatelessStack, StatelessStackProps } from "@itzworking/cdk";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

import { ITzS3Buckets } from "./itz-constructs";

export type S3BucketsStatelessStackProps = StatelessStackProps & {
  s3Buckets: { publicBucketArn: string; privateBucketArn: string };
};

export class S3BucketsStatelessStack extends StatelessStack {
  constructor(
    scope: Construct,
    id: string,
    props: S3BucketsStatelessStackProps,
  ) {
    super(scope, id, props);

    const hostedZoneDomainName = props.configurations.core.hostedZoneDomainName;
    const domainName = props.configurations.core.domainName;

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: hostedZoneDomainName,
    });

    const certificate = new acm.Certificate(
      this.getGlobalResourceScope(),
      "BucketsCertificate",
      {
        domainName,
        subjectAlternativeNames: [`*.${domainName}`],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      },
    );

    ITzS3Buckets.setupS3Distributions(this, {
      s3Buckets: props.s3Buckets,
      hostedZone,
      certificate,
      domainName,
    });
  }

  getLambdasFolderPath(): string {
    return `${__dirname}/src/lambdas`;
  }

  getServiceName(): string {
    return "S3BucketsService";
  }
}
