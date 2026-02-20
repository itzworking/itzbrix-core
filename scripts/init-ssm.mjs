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
    // Website Domains
    // "/core/website-domains/assets/default/hosted-zone-domain-name": "itzbrix.com",
    // "/core/website-domains/assets/default/domain-name": "ucassets.itzbrix.com",
    "/core/website-domains/live/default/hosted-zone-domain-name": "itzbrix.com",
    "/core/website-domains/live/default/domain-name": "itzbrix.com",
    "/core/website-domains/previews/default/hosted-zone-domain-name":
      "itzbrix.com",
    "/core/website-domains/previews/default/domain-name": "tmpprv.itzbrix.com",
    "/core/website-domains/revisions/default/hosted-zone-domain-name":
      "itzbrix.com",
    "/core/website-domains/revisions/default/domain-name":
      "tmprvss.itzbrix.com",
  },
  override: true,
}).then(() => console.log("SSM parameters initialized!"));
