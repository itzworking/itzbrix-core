import {
  Attribute,
  AttributeType,
  DecoratedClass,
  OptionalProps,
} from "@itzworking/decorated-class";

import { CallerContext } from "../caller-context";

export class CognitoCustomerSenderEventDetailRequest extends DecoratedClass {
  @Attribute(AttributeType.String)
  type: string;

  @Attribute(AttributeType.String)
  plainTextCode: string | null;

  @Attribute(AttributeType.Object)
  userAttributes: { [key: string]: string } | undefined;

  @Attribute(AttributeType.Object)
  clientMetadata?: { [key: string]: string } | undefined;

  constructor(props: OptionalProps<CognitoCustomerSenderEventDetailRequest>) {
    super(props);
  }
}

export class CognitoCustomSenderEventDetail extends DecoratedClass {
  @Attribute(AttributeType.String)
  version: string;

  @Attribute(AttributeType.String)
  region: string;

  @Attribute(AttributeType.String)
  userPoolId: string;

  @Attribute(AttributeType.String)
  triggerSource: string;

  @Attribute(AttributeType.String)
  userName: string;

  @Attribute(AttributeType.Object, { nestedType: CallerContext })
  callerContext: CallerContext;

  @Attribute(AttributeType.Object, {
    nestedType: CognitoCustomerSenderEventDetailRequest,
  })
  request: CognitoCustomerSenderEventDetailRequest;

  @Attribute(AttributeType.Object)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;

  constructor(props: OptionalProps<CognitoCustomSenderEventDetail>) {
    super(props);
  }
}
