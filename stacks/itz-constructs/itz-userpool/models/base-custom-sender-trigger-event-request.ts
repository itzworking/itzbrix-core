import {
  Attribute,
  AttributeType,
  DecoratedClass,
  OptionalProps,
} from "@itzworking/decorated-class";

import { AwsCryptoClient } from "../utils/aws-crypto-client";

export class BaseCustomSenderTriggerEventRequest extends DecoratedClass {
  @Attribute(AttributeType.String)
  type: string;

  @Attribute(AttributeType.String)
  code: string | null;

  @Attribute(AttributeType.String)
  plainTextCode: string | null;

  @Attribute(AttributeType.Object)
  userAttributes: { [key: string]: string } | undefined;

  @Attribute(AttributeType.Object)
  clientMetadata?: { [key: string]: string } | undefined;

  constructor(props: OptionalProps<BaseCustomSenderTriggerEventRequest>) {
    super(props);
  }

  async setPlainTextCode() {
    if (this.code) {
      this.plainTextCode = await AwsCryptoClient.decrypt(this.code);
    }
  }
}
