import {
  Attribute,
  AttributeType,
  DecoratedClass,
  OptionalProps,
} from "@itzworking/decorated-class";

import { BaseCustomSenderTriggerEventRequest } from "./base-custom-sender-trigger-event-request";
import { CallerContext } from "./caller-context";

export class BaseCustomSenderTriggerEvent extends DecoratedClass {
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
    nestedType: BaseCustomSenderTriggerEventRequest,
  })
  request: BaseCustomSenderTriggerEventRequest;

  @Attribute(AttributeType.Object)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;

  constructor(props: OptionalProps<BaseCustomSenderTriggerEventRequest>) {
    super(props);
  }
}
