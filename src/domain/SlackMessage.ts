import { yesterdayInJst } from "./DateRange.js";
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

const mrkdwn = (text: string): SlackMrkdwnText => ({ type: "mrkdwn", text });

const section = (text: string): SlackBlock => ({
  type: "section",
  text: mrkdwn(text),
});

const context = (text: string): SlackBlock => ({
  type: "context",
  elements: [mrkdwn(text)],
});

const divider = (): SlackBlock => ({ type: "divider" });

const formatNumber = (value: number): string => value.toLocaleString("en-US");

/** "2026-08-22" -> "8/22" */
function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** "2026-08-22" -> "2026/8/22" */
function longDate(date: string): string {
  const [year] = date.split("-");
  return `${year}/${shortDate(date)}`;
}

/** "今月 8/1〜8/22" のような期間ラベル */
function periodTitle(label: string, period: GA4PeriodMetrics | null): string {
  if (period === null) {
    return label;
  }
  return `${label} ${shortDate(period.range.startDate)}〜${shortDate(period.range.endDate)}`;
}

function trend(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "➖ ±0%" : "🆕 前年データなし";
  }
  const rate = ((current - previous) / previous) * 100;
  if (Math.abs(rate) < 0.05) {
    return "➖ ±0%";
  }
  const icon = rate > 0 ? "🔼" : "🔽";
  const sign = rate > 0 ? "+" : "";
  return `${icon} ${sign}${rate.toFixed(1)}%`;
}

function metricLine(
  label: string,
  current: number | undefined,
  previous: number | undefined,
): string {
  if (current === undefined) {
    return `${label} ${NO_DATA}`;
  }
  const value = `${label} ${formatNumber(current)}`;
  return previous === undefined
    ? value
    : `${value} ${trend(current, previous)}`;
}

function lastYearLine(period: GA4PeriodMetrics | null): string {
  if (period === null || period.metrics === null) {
    return `前年 ${NO_DATA}`;
  }
  return `前年 ${formatNumber(period.metrics.pv)} / ${formatNumber(period.metrics.activeUsers)}`;
}

function periodField(
  title: string,
  period: GA4PeriodMetrics | null,
  lastYear: GA4PeriodMetrics | null,
): SlackMrkdwnText {
  if (period === null || period.metrics === null) {
    return mrkdwn(`*${title}*\n${NO_DATA}`);
  }
  return mrkdwn(
    [
      `*${title}*`,
      metricLine("PV", period.metrics.pv, lastYear?.metrics?.pv),
      metricLine(
        "UU",
        period.metrics.activeUsers,
        lastYear?.metrics?.activeUsers,
      ),
      lastYearLine(lastYear),
    ].join("\n"),
  );
}

function websiteBlocks(data: GA4WebsiteData, yesterday: string): SlackBlock[] {
  const { monthly } = data;

  return [
    {
      type: "section",
      text: mrkdwn(`*🌐 ${data.websiteName}*`),
      fields: [
        periodField(
          periodTitle("今月", monthly.currentMonth),
          monthly.currentMonth,
          monthly.currentMonthLastYear,
        ),
        periodField(
          periodTitle("先月", monthly.lastMonth),
          monthly.lastMonth,
          monthly.lastMonthLastYear,
        ),
      ],
    },
    context(
      [
        `📅 うち昨日 ${shortDate(yesterday)} PV ${formatNumber(data.pv)} / UU ${formatNumber(data.activeUsers)}`,
        `🔖 ${data.property}`,
      ].join("\n"),
    ),
    divider(),
  ];
}

export function from(
  ga4s: GA4WebsiteData[],
  now: Date = new Date(),
): SlackMessage {
  const yesterday = yesterdayInJst(now);
  const header: SlackBlock = {
    type: "header",
    text: {
      type: "plain_text",
      text: "📊 サイト指標レポート",
      emoji: true,
    },
  };

  if (ga4s.length === 0) {
    return {
      blocks: [header, section(`対象サイトのデータが${NO_DATA}でした`)],
    };
  }

  return {
    blocks: [
      header,
      context(
        `🗓️ ${longDate(yesterday)} までの確定データ ・ 🔼🔽 は前年同期比 ・ 前年 は前年同期の PV / UU（PV＝表示回数 / UU＝アクティブユーザ）`,
      ),
      divider(),
      ...ga4s.flatMap((data) => websiteBlocks(data, yesterday)),
    ],
  };
}
