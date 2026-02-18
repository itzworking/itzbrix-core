import {
  Attribute,
  AttributeType,
  DecoratedClass,
  OptionalProps,
} from "@itzworking/decorated-class";

export class CallerContext extends DecoratedClass {
  @Attribute(AttributeType.String)
  awsSdkVersion: string;

  @Attribute(AttributeType.String)
  clientId: string;

  constructor(props: OptionalProps<CallerContext>) {
    super(props);
  }
}
