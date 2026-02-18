import * as path from "path";

import {
  CognitoConstruct as ITzCognitoConstruct,
  Configurations as ITzConfigurations,
} from "@itzworking/cdk";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as events from "aws-cdk-lib/aws-events";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

import { CognitoLambdaConstruct } from "./cognito-lambda-construct";



export interface ITzUserPoolConstructProps {
  configurations: ITzConfigurations;
  mainEventBus: events.EventBus;
  cognitoConstruct: ITzCognitoConstruct;
  userPoolId?: string;
}

/**
 * CDK Construct that creates and configures a Cognito User Pool with Lambda triggers.
 *
 * Features:
 * - **Multi-factor Authentication**: Supports password, email OTP, SMS OTP, and passkey
 * - **Lambda Triggers**: Custom sender (email/SMS), pre-token generation, post-confirmation, pre-sign-up
 * - **KMS Encryption**: Uses dedicated KMS key for custom sender security
 * - **Sign-in Methods**: Email and phone number aliases
 * - **Self Sign-up**: Enabled with configurable password policy (min 6 chars, uppercase, lowercase, digits)
 * - **Account Recovery**: Email-only recovery
 * - **User Groups**: Creates a default "master" group
 *
 * All Lambda triggers are connected to the main event bus for event-driven workflows.
 */
export class ITzUserPoolConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ITzUserPoolConstructProps) {
    super(scope, id);

    const {
      configurations,
      mainEventBus,
      cognitoConstruct,
      userPoolId = "MainUserPool",
    } = props;

    /**
     * Setup kms key for cognito custom sender
     */
    const userPoolKmsKeyAlias = `alias/${configurations.applicationName}/cognito-kms-key`;
    const userPoolKms = new kms.Key(this, "KmsKey", {
      alias: userPoolKmsKeyAlias,
      removalPolicy: configurations.core.removalPolicy,
    });

    /**
     * Lambda triggers for cognito user pool
     */
    const lambdaProps = {
      environmentType: configurations.core.environmentType,
      logLevel: configurations.core.logLevel,
      domainName: configurations.core.domainName,
      mainEventBus: mainEventBus,
      userPoolKms,
      userPoolKmsKeyAlias,
    };

    const lambdasDirectory = path.join(__dirname, "lambdas");

    const customSenderLambda = new CognitoLambdaConstruct(
      this,
      "CustomSender",
      {
        description: "Cognito: Custom sender Lambda trigger",
        entry: `${lambdasDirectory}/custom-sender.ts`,
        ...lambdaProps,
      },
    );
    const preTokenGenerationLambda = new CognitoLambdaConstruct(
      this,
      "PreTokenGeneration",
      {
        description: "Cognito: Pre token generation Lambda trigger",
        entry: `${lambdasDirectory}/pre-token-generation.ts`,
        ...lambdaProps,
      },
    );
    const postConfirmationLambda = new CognitoLambdaConstruct(
      this,
      "PostConfirmation",
      {
        description: "Cognito: Post confirmation Lambda trigger",
        entry: `${lambdasDirectory}/post-confirmation.ts`,
        ...lambdaProps,
      },
    );
    const preSignUpLambda = new CognitoLambdaConstruct(this, "PreSignUp", {
      description: "Cognito: Pre sign-up Lambda trigger",
      entry: `${lambdasDirectory}/pre-sign-up.ts`,
      ...lambdaProps,
    });

    /**
     * Create cognito user pool
     */
    const userPool = cognitoConstruct.addUserPool(userPoolId, {
      customSenderKmsKey: userPoolKms,
      selfSignUpEnabled: true,
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true, // password authentication must be enabled
          emailOtp: true, // enables email message one-time password
          smsOtp: true, // enables SMS message one-time password
          passkey: true, // enables passkey sign-in
        },
      },
      signInAliases: {
        email: true,
        phone: true,
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      lambdaTriggers: {
        customEmailSender: customSenderLambda.function,
        customSmsSender: customSenderLambda.function,
        preTokenGeneration: preTokenGenerationLambda.function,
        postConfirmation: postConfirmationLambda.function,
        preSignUp: preSignUpLambda.function,
      },
      keepOriginal: {
        email: true,
        phone: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    new cognito.CfnUserPoolGroup(this, "UserPoolMasterGroup", {
      userPoolId: userPool.userPoolId,
      description: "Master group",
      groupName: "master",
    });
  }
}
