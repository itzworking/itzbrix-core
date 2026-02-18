import {
  CoreStack as ITzCoreStack,
  CoreStackProps as ITzCoreStackProps,
} from "@itzworking/cdk";
import { Construct } from "constructs";

import { ITzUserPoolConstruct } from "./itz-constructs";

export class CoreStack extends ITzCoreStack {
  constructor(scope: Construct, id: string, props: ITzCoreStackProps) {
    super(scope, id, props);

    new ITzUserPoolConstruct(this, "MainCognitoUserPool", {
      configurations: props.configurations,
      mainEventBus: this.mainEventBus,
      cognitoConstruct: this.cognito,
    });
  }
}
