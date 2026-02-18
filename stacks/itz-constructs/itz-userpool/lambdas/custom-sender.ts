import { EventsManager } from "@itzworking/events-manager";
import { logger } from "@itzworking/powertools";
import {
  CustomEmailSenderTriggerEvent,
  CustomSMSSenderTriggerEvent,
} from "aws-lambda";

import { BaseCustomSenderTriggerEvent } from "../models/base-custom-sender-trigger-event";
import { CognitoCustomSenderEventDetail } from "../models/events/cognito-custom-sender-event-detail";

const domainName = process.env.DOMAIN_NAME || "";

export const handler = async (
  event: CustomEmailSenderTriggerEvent | CustomSMSSenderTriggerEvent,
) => {
  logger.debug("CustomSenderEvent", { event });

  const customSenderTriggerEvent = new BaseCustomSenderTriggerEvent(event);
  await customSenderTriggerEvent.request.setPlainTextCode();
  logger.debug("new BaseCustomSenderTriggerEvent", {
    customSenderTriggerEvent,
  });

  if (event.triggerSource === "CustomEmailSender_SignUp") {
    logger.debug(
      `https://auth.${domainName}/confirmUser?client_id=${event.callerContext.clientId}&user_name=${event.request.userAttributes.sub}&confirmation_code=${customSenderTriggerEvent.request.plainTextCode}`,
    );
  }

  await EventsManager.publishEvent(
    CognitoCustomSenderEventDetail,
    customSenderTriggerEvent.triggerSource,
    customSenderTriggerEvent,
  );

  return event;
};
