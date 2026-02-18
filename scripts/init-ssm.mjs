import { initSsm } from "@itzworking/devkit";
import { SSMClient } from "@aws-sdk/client-ssm";

initSsm({
  applicationName: "ITzJulien",
  ssmClient: new SSMClient({}),
  parameters: {
    "/core/hosted-zone-domain-name": "itzjulien.com",
    "/core/domain-name": "itzjulien.com",
    "/core/environment-type": "development",
    "/core/removal-policy": "destroy",
    "/core/log-level": "debug",
    "/core/log-retention-days": "9999",
    // "/core/branch": "main",
  },
  override: true,
}).then(() => console.log("SSM parameters initialized!"));
