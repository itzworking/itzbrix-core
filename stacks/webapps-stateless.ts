import { writeFileSync } from "fs";
import { join } from "path";

import {
  CoreStack,
  DomainStack,
  ITzWorkingStack,
  ITzWorkingStackProps,
} from "@itzworking/cdk";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import { Construct } from "constructs";

import { ITzNextJSConstruct } from "./itz-constructs";

export interface WebappsStackProps extends ITzWorkingStackProps {
  core: CoreStack;
  domain: DomainStack;
  userPoolId?: string;
}

export class WebappsStatelessStack extends ITzWorkingStack {
  constructor(scope: Construct, id: string, props: WebappsStackProps) {
    super(scope, id, props);
    const webappDomainName = `www.${props.core.domainName}`;
    const productionDomainName = "itzbrix.com";

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.configurations.core.hostedZoneDomainName,
    });
    new route53Patterns.HttpsRedirect(this, "BaseDomainRedirection", {
      zone: hostedZone,
      targetDomain: webappDomainName,
      recordNames: [props.core.domainName],
      certificate: props.domain.globalCertificate,
    });

    this.setupWebapp("www", {
      userPool: props.core.cognito.userPools["MainUserPool"],
      domainName: props.core.domainName,
      productionDomainName,
      webappDomainName,
      localhost: "localhost:2632",
      applicationName: props.core.applicationName,
      repository: "https://github.com/itzworking/itzbrix-www",
      branchName: props.configurations.core.branch,
    });
  }

  private writeDotEnvFile(key: string, env: { [key: string]: string }) {
    const formatedEnv: string[] = [];
    for (const [key, value] of Object.entries(env)) {
      if (key === "NODE_ENV") {
        continue;
      }
      if (key === "NEXT_PUBLIC_ENV") {
        formatedEnv.push(`${key}=local`);
      } else {
        formatedEnv.push(`${key}=${value}`);
      }
    }
    writeFileSync(join(__dirname, `.env.${key}`), formatedEnv.join("\n"));
  }

  private setupWebapp(
    id: string,
    props: {
      userPool?: cognito.IUserPool;
      domainName: string;
      productionDomainName: string;
      webappDomainName: string;
      localhost?: string;
      applicationName: string;
      repository?: string;
      branchName?: string;
    },
  ) {
    const isProduction = props.productionDomainName === props.domainName;

    let userPoolClient: cognito.UserPoolClient | undefined;
    if (props.userPool) {
      userPoolClient = new cognito.UserPoolClient(this, `${id}UserPoolClient`, {
        userPool: props.userPool,
        generateSecret: false,
        authFlows: {
          adminUserPassword: false,
          custom: false,
          userPassword: !isProduction, // Allow user password flow in development for testing purposes
          userSrp: true,
          user: true,
        },
        disableOAuth: false,
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
            clientCredentials: false,
          },
          callbackUrls: props.localhost
            ? [`http://${props.localhost}`, `https://${props.webappDomainName}`]
            : [`https://${props.webappDomainName}`],
          logoutUrls: props.localhost
            ? [`http://${props.localhost}`, `https://${props.webappDomainName}`]
            : [`https://${props.webappDomainName}`],
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.COGNITO_ADMIN,
            cognito.OAuthScope.PROFILE,
            cognito.OAuthScope.PHONE,
          ],
        },
        authSessionValidity: cdk.Duration.minutes(3),
        preventUserExistenceErrors: true,
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
        idTokenValidity: cdk.Duration.minutes(60),
        refreshTokenValidity: cdk.Duration.days(30),
        accessTokenValidity: cdk.Duration.minutes(60),
        readAttributes: new cognito.ClientAttributes().withStandardAttributes({
          // address: false,
          // birthdate: false,
          email: true,
          // familyName: false,
          // gender: false,
          // givenName: false,
          locale: true,
          // middleName: false,
          fullname: true,
          nickname: true,
          phoneNumber: true,
          profilePicture: true,
          preferredUsername: true,
          profilePage: true,
          timezone: true,
          lastUpdateTime: true,
          website: true,
          emailVerified: true,
          phoneNumberVerified: true,
        }),
        writeAttributes: new cognito.ClientAttributes().withStandardAttributes({
          // address: false,
          // birthdate: false,
          email: true,
          // familyName: false,
          // gender: false,
          // givenName: false,
          locale: true,
          // middleName: false,
          fullname: true,
          nickname: true,
          phoneNumber: true,
          profilePicture: true,
          preferredUsername: false,
          profilePage: true,
          timezone: true,
          lastUpdateTime: true,
          website: true,
          emailVerified: false,
          phoneNumberVerified: false,
        }),
        enableTokenRevocation: true,
      });

      new cdk.CfnOutput(this, `${id}UserPoolIdCfnOutput`, {
        key: id + "UserPoolId",
        value: props.userPool.userPoolId,
      });

      new cdk.CfnOutput(this, `${id}UserPoolClientIdCfnOutput`, {
        key: id + "UserPoolClientId",
        value: userPoolClient.userPoolClientId,
      });
    }

    const environmentVariables: {
      [key: string]: string;
    } = {
      NODE_ENV: "production",
      NEXT_PUBLIC_ENV: isProduction ? "production" : "development",
      NEXT_PUBLIC_AWS_PROJECT_REGION: cdk.Stack.of(this).region,
      NEXT_PUBLIC_AWS_USER_POOL_ID: props.userPool
        ? props.userPool.userPoolId
        : "",
      NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID: userPoolClient
        ? userPoolClient.userPoolClientId
        : "",
      // Domains
      NEXT_PUBLIC_PRODUCTION_DOMAIN_NAME: `${props.productionDomainName}`,
      NEXT_PUBLIC_DOMAIN_NAME: `${props.domainName}`,
    };

    this.writeDotEnvFile(id, environmentVariables);

    new ITzNextJSConstruct(this, `${id}AmplifyNextJS`, {
      applicationName: props.applicationName,
      repository: props.repository,
      branchName: props.branchName,
      nextJsDomainName: props.webappDomainName,
      domainName: props.domainName,
      productionDomainName: props.productionDomainName,
      environmentVariables,
    });
  }
}
