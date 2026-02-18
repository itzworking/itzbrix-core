import { EventBridgeEvent } from "aws-lambda";

interface AmplifyEvent {
  appId: string;
  branchName: string;
  jobId: string;
  jobStatus: "SUCCEED" | "FAILED" | "STARTED";
}

const STATUS_MAP: Record<
  string,
  { emoji: string; color: number; label: string }
> = {
  STARTED: { emoji: "🏗️", color: 0xffa500, label: "Deployment Started" },
  SUCCEED: { emoji: "🎉", color: 0x00ff00, label: "Deployment Successful" },
  FAILED: { emoji: "💥", color: 0xff0000, label: "Deployment Failed" },
};

const createAmplifyMessage = (detail: AmplifyEvent) => {
  const region = process.env.AWS_REGION;
  const appId = process.env.AMPLIFY_APP_ID;
  const repoUrl = process.env.REPOSITORY_URL ?? "";
  const branch = process.env.BRANCH_NAME ?? detail.branchName;
  const domain = process.env.WEBAPP_DOMAIN_NAME;

  const repo = repoUrl.replace(/^https?:\/\/github\.com\//, "");
  const consoleUrl = `https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}/${detail.branchName}/${detail.jobId}`;
  const status = STATUS_MAP[detail.jobStatus] ?? {
    emoji: "❓",
    color: 0x808080,
    label: "Unknown Status",
  };

  const description = [
    `**Branch:** \`${branch}\``,
    `**URL:** https://${domain}`,
    `**Console:** [View in AWS](${consoleUrl})`,
    detail.jobStatus === "FAILED" ? "\n@everyone" : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    embeds: [
      {
        title: `${status.emoji} ${repo} — ${status.label}`,
        url: repoUrl,
        description,
        color: status.color,
        timestamp: new Date().toISOString(),
      },
    ],
  };
};

export const handler = async (
  event: EventBridgeEvent<"Amplify Deployment Status Change", AmplifyEvent>,
) => {
  try {
    const message = createAmplifyMessage(event.detail);
    const discordWebhookUrl =
      "https://discord.com/api/webhooks/1470792481019793490/nkRFtwPJ8ngF32oHH5b6BthB9Zzkl8nMJPrxpyUrywJiehXSNp2StjT7gn9kbqXthaRC";

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    console.log("Successfully sent notification to Discord");
  } catch (error) {
    console.error("Failed to send notification to Discord:", error);
    throw error;
  }
};
