import {
  StatefulStack as ITzStatefulStack,
  StatefulStackProps as ITzStatefulStackProps,
} from "@itzworking/cdk";
import { Construct } from "constructs";

import { ITzS3Buckets } from "./itz-constructs";

export class StatefulStack extends ITzStatefulStack {
  readonly s3Buckets: ITzS3Buckets;

  constructor(scope: Construct, id: string, props: ITzStatefulStackProps) {
    super(scope, id, props);

    this.dynamodb.addTable("MainTable");
    this.dynamodb.addTable("UsersTable");

    this.s3Buckets = new ITzS3Buckets(this, "S3Buckets", {
      configurations: props.configurations,
      s3Construct: this.s3,
    });

    /**
     * Capabilities
     */
    this.dynamodb.addTable("Emails");
    this.dynamodb.addTable("WebsocketConnections");
  }
}
