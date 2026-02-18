import { PostConfirmationTriggerEvent } from "aws-lambda";

import { CognitoClient } from "../utils/cognito-client";

export const handler = async (event: PostConfirmationTriggerEvent) => {
  if (
    event.triggerSource === "PostConfirmation_ConfirmSignUp" &&
    !event.request.userAttributes["preferred_username"]
  ) {
    await CognitoClient.setUserPreferredUsername({
      userPoolId: event.userPoolId,
      userName: event.userName,
      userAttributes: event.request.userAttributes,
    });
  }

  return event;
};
