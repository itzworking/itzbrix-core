import {
  Attribute,
  AttributeType,
  DecoratedClass,
  NotNull,
  OptionalProps,
} from "@itzworking/decorated-class";

export class UserPreferredUsernameSetEventDetail extends DecoratedClass {
  @NotNull
  @Attribute(AttributeType.String)
  userPoolId: string;

  @NotNull
  @Attribute(AttributeType.String)
  userName: string;

  @Attribute(AttributeType.String)
  name?: string;

  @NotNull
  @Attribute(AttributeType.String)
  userId: string;

  @NotNull
  @Attribute(AttributeType.String)
  preferredUsername: string;

  @Attribute(AttributeType.String)
  email: string;

  @Attribute(AttributeType.String)
  zoneinfo?: string;

  @Attribute(AttributeType.String)
  locale?: string;

  constructor(props: OptionalProps<UserPreferredUsernameSetEventDetail>) {
    super(props);
  }
}
