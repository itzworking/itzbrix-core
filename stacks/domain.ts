import {
  DomainStack as ITzDomainStack,
  DomainStackProps as ITzDomainStackProps,
} from "@itzworking/cdk";
import { Construct } from "constructs";

export class DomainStack extends ITzDomainStack {
  constructor(scope: Construct, id: string, props: ITzDomainStackProps) {
    super(scope, id, props);
  }
}
