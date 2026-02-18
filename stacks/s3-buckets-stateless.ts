import { StatelessStack, StatelessStackProps } from "@itzworking/cdk";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

import { ITzS3Buckets } from "./itz-constructs";
import { StatefulStack } from "./stateful";

export class S3BucketsStatelessStack extends StatelessStack {
  constructor(scope: Construct, id: string, props: StatelessStackProps) {
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

    const s3Buckets = [props.stateful]
      .flat()
      .find((s) => s instanceof StatefulStack)?.s3Buckets;
    ITzS3Buckets.setupS3Distributions(this, {
      s3Buckets,
      hostedZone,
      certificate,
      domainName,
    });

    // this.loadLambdasFromFolderPath();
  }

  getLambdasFolderPath(): string {
    return `${__dirname}/src/lambdas`;
  }

  getServiceName(): string {
    return "S3BucketsService";
  }
}
