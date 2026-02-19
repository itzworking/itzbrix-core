import { initSsm } from "@itzworking/devkit";
import { SSMClient } from "@aws-sdk/client-ssm";

initSsm({
  applicationName: "ITzBrix",
  ssmClient: new SSMClient({}),
  parameters: {
    "/core/hosted-zone-domain-name": "itzbrix.com",
    "/core/domain-name": "itzbrix.com",
    "/core/environment-type": "development",
    "/core/removal-policy": "destroy",
    "/core/log-level": "debug",
    "/core/log-retention-days": "9999",
    // "/core/branch": "main",
    "/notifications/email/from-email": "Brix <no-reply@itzbrix.com>",
  },
  override: true,
}).then(() => console.log("SSM parameters initialized!"));
