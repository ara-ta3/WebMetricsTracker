import type { GA4Data } from "./GA4.js";

export type SlackPlainText = {
  type: "plain_text";
  text: string;
  emoji?: boolean;
};

export type SlackMrkdwnText = {
  type: "mrkdwn";
  text: string;
};

export type SlackText = SlackPlainText | SlackMrkdwnText;

export interface SlackBlock {
  type: string;
  text?: SlackText;
  fields?: SlackText[];
  elements?: SlackText[];
}

export interface SlackMessage {
  blocks: SlackBlock[];
}

export function from(ga4s: GA4Data[]): SlackMessage {
  const header: SlackPlainText = {
    type: "plain_text",
    text: "📊 GA4データレポート",
    emoji: true,
  };
  const data: SlackBlock[] = ga4s.flatMap((data) => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.property}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Daily PV:* ${data.pv}`,
          },
          {
            type: "mrkdwn",
            text: `*DAU:* ${data.activeUsers}`,
          },
        ],
      },
      {
        type: "divider",
      },
    ];
  });
  return {
    blocks: [{ type: "header", text: header }, ...data],
  };
}
