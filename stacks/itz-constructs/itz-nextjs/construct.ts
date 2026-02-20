import * as path from "path";

import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as customResources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

import { lambdaBundlingOptions } from "../lambda-bundling-options";

interface ITzNextJSConstructProps {
  readonly applicationName: string;
  readonly repository?: string;
  readonly branchName?: string;
  // readonly monorepoAppRoot?: string;
  readonly nextJsDomainName?: string;
  readonly domainName: string;
  readonly productionDomainName: string;
  readonly disableBuildNotifications?: boolean;

  readonly environmentVariables?: {
    // NODE_ENV: string;
    [key: string]: string;
  };
}

export class ITzNextJSConstruct extends Construct {
  public readonly app: amplify.CfnApp | null;
  public readonly appId: string | null;

  constructor(scope: Construct, id: string, props: ITzNextJSConstructProps) {
    super(scope, id);

    const {
      applicationName,
      repository,
      branchName,
      nextJsDomainName,
      disableBuildNotifications,
      environmentVariables = {},
    } = props;

    if (!repository || !branchName) {
      this.app = null;
      this.appId = null;
      return;
    }

    const amplifyRole = new iam.Role(this, "AmplifyRole", {
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AdministratorAccess-Amplify",
        ),
      ],
    });

    this.app = new amplify.CfnApp(this, "App", {
      repository,
      oauthToken: cdk.SecretValue.secretsManager(
        `${applicationName}/gh-token`,
      ).unsafeUnwrap(),
      name: applicationName,
      iamServiceRole: amplifyRole.roleArn,
      enableBranchAutoDeletion: true,
      environmentVariables: Object.entries({
        AMPLIFY_DIFF_DEPLOY: "true",
      }).map(([key, value]) => ({
        name: key,
        value: value,
      })),
      autoBranchCreationConfig: {
        enableAutoBranchCreation: false,
        framework: "Next.js - SSR",
      },
      platform: "WEB_COMPUTE",
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: "1.0",
        frontend: {
          phases: {
            preBuild: {
              commands: ["npm install --include=dev"],
            },
            build: {
              commands: [`npm run build`],
            },
          },
          artifacts: {
            baseDirectory: ".next",
            files: ["**/*"],
          },
          cache: {
            paths: ["node_modules/**/*"],
          },
          buildPath: "/",
        },
      }).toBuildSpec(),
    });

    this.appId = this.app.attrAppId;
    new cdk.CfnOutput(this, "ITzAmplifyIdCfnOutput", {
      key: `${id}ITzAmplifyId`,
      value: this.appId,
    });

    const branch = new amplify.CfnBranch(this, "branch", {
      appId: this.appId,
      branchName,
      enableAutoBuild: true,
      stage: "PRODUCTION",
      environmentVariables: Object.entries(environmentVariables).map(
        ([key, value]) => ({
          name: key,
          value: value,
        }),
      ),
      framework: "Next.js - SSR",
    });

    const defaultDomainName = `${branch.branchName}.${this.app.attrDefaultDomain}`;
    if (nextJsDomainName) {
      const domain = new amplify.CfnDomain(this, "Domain", {
        appId: this.appId,
        domainName: nextJsDomainName,
        subDomainSettings: [
          {
            branchName: branch.branchName,
            prefix: "",
          },
        ],
      });
      domain.addDependency(branch);

      const updatePlatform = new customResources.AwsCustomResource(
        this,
        "UpdatePlatform",
        {
          policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({
            resources: customResources.AwsCustomResourcePolicy.ANY_RESOURCE,
          }),
          onCreate: {
            service: "Amplify",
            action: "updateApp",
            physicalResourceId: customResources.PhysicalResourceId.of(
              "app-update-platform",
            ),
            parameters: {
              appId: this.appId,
              customRules: [
                {
                  source: `https://${defaultDomainName}`,
                  target: `https://${nextJsDomainName}`,
                  status: "301",
                },
              ],
            },
          },
        },
      );
      updatePlatform.node.addDependency(this.app);
    }

    /**
     * Notifications
     */
    if (!disableBuildNotifications) {
      const notificationsHandler = new nodejs.NodejsFunction(
        this,
        "AmplifyNotifications",
        {
          description: "Notifications handler for Amplify events",
          entry: path.join(__dirname, "lambdas", "notifications.ts"),
          timeout: cdk.Duration.seconds(15),
          environment: {
            REPOSITORY_URL: props.repository || "",
            BRANCH_NAME: props.branchName || "",
            WEBAPP_DOMAIN_NAME: nextJsDomainName ?? defaultDomainName,
            DOMAIN_NAME: props.domainName,
            PRODUCTION_DOMAIN_NAME: props.productionDomainName,
            AMPLIFY_APP_ID: this.appId,
          },
          bundling: lambdaBundlingOptions,
        },
      );
      const amplifyRule = new events.Rule(this, "AmplifyDeploymentRule", {
        eventPattern: {
          source: ["aws.amplify"],
          detail: {
            appId: [this.appId],
            jobStatus: ["SUCCEED", "FAILED", "STARTED"],
          },
        },
      });
      amplifyRule.addTarget(
        new eventsTargets.LambdaFunction(notificationsHandler),
      );
    }
  }
}
