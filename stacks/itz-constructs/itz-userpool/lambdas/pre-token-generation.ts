import { PreTokenGenerationTriggerEvent } from "aws-lambda";

import { CognitoClient } from "../utils/cognito-client";

export const handler = async (event: PreTokenGenerationTriggerEvent) => {
  if (!event.request.userAttributes["preferred_username"]) {
    const preferredUsername = await CognitoClient.setUserPreferredUsername({
      userPoolId: event.userPoolId,
      userName: event.userName,
      userAttributes: event.request.userAttributes,
    });
    event.response.claimsOverrideDetails = {
      claimsToAddOrOverride: {
        preferred_username: preferredUsername,
      },
    };
  }

  return event;
};
