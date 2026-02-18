import { PreSignUpTriggerEvent } from "aws-lambda";

import { CognitoClient } from "../utils/cognito-client";

export const handler = async (event: PreSignUpTriggerEvent) => {
  const cognitoUsersWithSameEmail = await CognitoClient.listCognitoUsersByEmail(
    event.userPoolId,
    event.request.userAttributes.email,
  );

  if (cognitoUsersWithSameEmail.length > 0) {
    if (!cognitoUsersWithSameEmail.find((c) => c.Enabled)) {
      throw new Error("User is disabled");
    }
  }

  return { ...event, response: { autoConfirmUser: true } };
};
