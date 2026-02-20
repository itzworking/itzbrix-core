import * as path from "path";

import { Duration } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export const createViewerRequestLambda = (scope: Construct) => {
  const edgeFunction = new cloudfront.experimental.EdgeFunction(
    scope,
    "DomainRedirectEdgeFunction",
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "viewer-request.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "lambdas/edge/viewer-request"),
      ),
      memorySize: 128,
      timeout: Duration.seconds(5),
      description:
        "Lambda@Edge function to redirect non-primary domains to primary domain and rewrite URLs",
    },
  );

  // Grant SSM read permissions (use wildcard to avoid cross-region parameter resolution)
  edgeFunction.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["ssm:GetParameter"],
      resources: ["*"],
    }),
  );

  // Grant DynamoDB read permissions
  edgeFunction.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["dynamodb:Query", "dynamodb:GetItem"],
      resources: ["*"],
    }),
  );

  return edgeFunction;
};
