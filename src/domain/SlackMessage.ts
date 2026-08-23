import type { GA4PeriodMetrics, GA4WebsiteData } from "./GA4.js";

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

const NO_DATA = "データなし";

const formatNumber = (value: number): string => value.toLocaleString("en-US");

function formatDiff(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "±0%" : "前年0のため比較不可";
  }
  const rate = ((current - previous) / previous) * 100;
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

function formatMetric(
  label: string,
  current: number | undefined,
  previous: number | undefined,
  hasLastYearPeriod: boolean,
): string {
  if (current === undefined) {
    return `*${label}:* ${NO_DATA}`;
  }
  if (!hasLastYearPeriod) {
    return `*${label}:* ${formatNumber(current)}`;
  }
  if (previous === undefined) {
    return `*${label}:* ${formatNumber(current)} （前年同期: ${NO_DATA}）`;
  }
  return `*${label}:* ${formatNumber(current)} （前年同期: ${formatNumber(previous)} / ${formatDiff(current, previous)}）`;
}

function periodSection(
  label: string,
  period: GA4PeriodMetrics | null,
  lastYear: GA4PeriodMetrics | null,
): SlackBlock {
  if (period === null) {
    return {
      type: "section",
      text: { type: "mrkdwn", text: `*${label}:* ${NO_DATA}` },
    };
  }
  const range = `${period.range.startDate} 〜 ${period.range.endDate}`;
  const lines = [
    `*${label}* (${range})`,
    formatMetric(
      "PV",
      period.metrics?.pv,
      lastYear?.metrics?.pv,
      lastYear !== null,
    ),
    formatMetric(
      "アクティブユーザ",
      period.metrics?.activeUsers,
      lastYear?.metrics?.activeUsers,
      lastYear !== null,
    ),
  ];
  return {
    type: "section",
    text: { type: "mrkdwn", text: lines.join("\n") },
  };
}

export function from(ga4s: GA4WebsiteData[]): SlackMessage {
  const header: SlackPlainText = {
    type: "plain_text",
    text: "📊 GA4データレポート（WebSite別）",
    emoji: true,
  };

  const data: SlackBlock[] = ga4s.flatMap((data) => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🌐 ${data.websiteName}*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Property: ${data.property}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Daily PV:* ${formatNumber(data.pv)}`,
          },
          {
            type: "mrkdwn",
            text: `*DAU:* ${formatNumber(data.activeUsers)}`,
          },
        ],
      },
      periodSection(
        "📅 今月（月初〜前日）",
        data.monthly.currentMonth,
        data.monthly.currentMonthLastYear,
      ),
      periodSection(
        "🗓️ 先月",
        data.monthly.lastMonth,
        data.monthly.lastMonthLastYear,
      ),
      {
        type: "divider",
      },
    ];
  });

  return {
    blocks: [{ type: "header", text: header }, ...data],
  };
}
