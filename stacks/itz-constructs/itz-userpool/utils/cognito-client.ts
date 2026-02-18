import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { EventsManager } from "@itzworking/events-manager";
import { customAlphabet } from "nanoid";

import { UserPreferredUsernameSetEventDetail } from "../models/events/user-preferred-username-set-event-detail";


class CognitoClientClass {
  private readonly nanoid: (size?: number) => string;
  private readonly cognito: CognitoIdentityProviderClient;

  constructor() {
    this.nanoid = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      10,
    );
    this.cognito = new CognitoIdentityProviderClient({});
  }

  generatePreferredUsername() {
    return "C-" + this.nanoid();
  }

  async listCognitoUsersByEmail(userPoolId: string, email: string) {
    const { Users: cognitoUsers } = await this.cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`,
      }),
    );
    return cognitoUsers || [];
  }

  async setUserPreferredUsername({
    userPoolId,
    userName,
    userAttributes,
  }: {
    userPoolId: string;
    userName: string;
    userAttributes: {
      [name: string]: string;
    };
  }) {
    let preferredUsername: string;

    const cognitoUsersWithSameEmail = await this.listCognitoUsersByEmail(
      userPoolId,
      userAttributes.email,
    );

    const cognitoUserWithSameEmailAndPreferredUsernameSet =
      cognitoUsersWithSameEmail.find((u) =>
        u.Attributes?.some((a) => a.Name === "preferred_username"),
      );

    if (cognitoUserWithSameEmailAndPreferredUsernameSet) {
      // We are sure that the user has a preferred_username attribute (see above)
      preferredUsername =
        cognitoUserWithSameEmailAndPreferredUsernameSet.Attributes?.find(
          (a) => a.Name === "preferred_username",
        )?.Value ?? "";

      const { Groups: currentGroups } = await this.cognito.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoUserWithSameEmailAndPreferredUsernameSet.Username,
        }),
      );
      for (const currentGroup of currentGroups || []) {
        await this.cognito.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: cognitoUserWithSameEmailAndPreferredUsernameSet.Username,
            GroupName: currentGroup.GroupName,
          }),
        );
      }
    } else {
      let users = [];
      do {
        preferredUsername = this.generatePreferredUsername();
        const { Users: cognitoUsers } = await this.cognito.send(
          new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `preferred_username = "${preferredUsername}"`,
          }),
        );
        users = cognitoUsers || [];
      } while (users.length > 0);
    }

    await this.cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userName,
        UserAttributes: [
          {
            Name: "preferred_username",
            Value: preferredUsername,
          },
        ],
      }),
    );

    await EventsManager.publishEvent(
      UserPreferredUsernameSetEventDetail,
      "UserPreferredUsernameSet",
      {
        ...userAttributes,
        userPoolId,
        userName,
        userId: preferredUsername,
        preferredUsername,
        name: userAttributes.name,
        email: userAttributes.email,
      },
    );

    return preferredUsername;
  }
}

export const CognitoClient = new CognitoClientClass();
