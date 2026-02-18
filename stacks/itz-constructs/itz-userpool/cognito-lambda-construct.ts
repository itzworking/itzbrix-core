import { Duration } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

import { lambdaBundlingOptions } from "../lambda-bundling-options";

export interface CognitoLambdaProps {
  description: string;
  entry: string;
  environmentType: string;
  logLevel: string;
  domainName: string;
  mainEventBus: events.EventBus;
  userPoolKms: kms.Key;
  userPoolKmsKeyAlias: string;
}

export class CognitoLambdaConstruct extends Construct {
  readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: CognitoLambdaProps) {
    super(scope, id);

    this.function = new nodejs.NodejsFunction(this, id, {
      description: props.description,
      entry: props.entry,
      timeout: Duration.seconds(28),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        NODE_ENV: props.environmentType,
        LOG_LEVEL: props.logLevel,
        DOMAIN_NAME: props.domainName,
        EVENT_BUS_NAME: props.mainEventBus.eventBusName,
        SERVICE_NAME: "CognitoService",
        POWERTOOLS_SERVICE_NAME: "CognitoService",
        NAMESPACE: props.domainName.split(".").reverse().join("."),
        COGNITO_KMS_KEY_ARN: props.userPoolKms.keyArn,
        COGNITO_KMS_KEY_ALIAS: props.userPoolKmsKeyAlias,
      },
      bundling: lambdaBundlingOptions,
    });

    props.mainEventBus.grantPutEventsTo(this.function);
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers",
        ],
        resources: ["*"],
      }),
    );
    props.userPoolKms.grantDecrypt(this.function);
  }
}
