import { yesterdayInJst } from "./DateRange.js";
import type {
  GA4ChannelMetrics,
  GA4LandingPageMetrics,
  GA4LandingPageSourceMetrics,
  GA4PeriodMetrics,
  GA4PageDetails,
  GA4SourceMetrics,
  GA4WebsiteData,
} from "./GA4.js";

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

/** 流入チャネルの表示上限 */
const CHANNEL_TOP_N = 3;

/** 参照元/メディアの表示上限 */
const SOURCE_TOP_N = 5;

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

/** "Organic Search 8,200 (62%) ・ Direct 2,800 (21%)" のような流入内訳 */
function channelLine(label: string, channels: GA4ChannelMetrics[]): string {
  if (channels.length === 0) {
    return `🔗 ${label}の流入 ${NO_DATA}`;
  }
  const total = channels.reduce((sum, c) => sum + c.sessions, 0);
  const top = channels
    .slice(0, CHANNEL_TOP_N)
    .map((c) => {
      const share = total === 0 ? 0 : Math.round((c.sessions / total) * 100);
      return `${c.channel} ${formatNumber(c.sessions)} (${share}%)`;
    })
    .join(" ・ ");
  return `🔗 ${label}の流入 ${top}`;
}

/** "google/organic 8,200 ・ (direct)/(none) 3,100" のような参照元内訳 */
function sourceLine(
  label: string,
  sources: GA4SourceMetrics[],
  topN: number = SOURCE_TOP_N,
): string {
  if (sources.length === 0) {
    return `🔎 ${label}の詳細TOP${topN} ${NO_DATA}`;
  }
  const top = sources
    .slice(0, topN)
    .map((s) => `${s.source}/${s.medium} ${formatNumber(s.sessions)}`)
    .join(" ・ ");
  return `🔎 ${label}の詳細TOP${topN} ${top}`;
}

const escapeMrkdwn = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const compactText = (value: string, maxLength: number): string => {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

function pageLink(path: string, pages: Map<string, GA4PageDetails>): string {
  const page = pages.get(path);
  const label = escapeMrkdwn(
    `${compactText(path, 100)}${page?.title ? ` (${compactText(page.title, 100)})` : ""}`,
  ).replaceAll("|", "｜");
  if (!page) {
    return label;
  }
  const link = `<${escapeMrkdwn(page.url).replaceAll("|", "%7C")}|${label}>`;
  return link.length <= 2300 ? link : label;
}

function landingPageLines(
  label: string,
  pages: GA4LandingPageMetrics[],
  sources: GA4LandingPageSourceMetrics[],
  details: Map<string, GA4PageDetails>,
): string[] {
  const pageLines = pages
    .slice(0, 3)
    .map(
      (page, index) =>
        `${index + 1}. ${pageLink(page.landingPage, details)} — ${formatNumber(page.sessions)}`,
    );
  const sourceLines = sources
    .slice(0, 3)
    .map(
      (source, index) =>
        `${index + 1}. ${pageLink(source.landingPage, details)} × ${escapeMrkdwn(compactText(`${source.source}/${source.medium}`, 100))} — ${formatNumber(source.sessions)}`,
    );
  return [
    `📄 ${label}のLP TOP3（セッション数）`,
    ...(pageLines.length === 0 ? [NO_DATA] : pageLines),
    `🔎 ${label}のLP×流入経路詳細 TOP3（セッション数）`,
    ...(sourceLines.length === 0 ? [NO_DATA] : sourceLines),
  ];
}

function rankingContexts(lines: string[]): SlackBlock[] {
  const texts: string[] = [];
  let text = "";
  for (const line of lines) {
    if (text.length + line.length + 1 > 3000) {
      texts.push(text);
      text = line;
    } else {
      text = text === "" ? line : `${text}\n${line}`;
    }
  }
  if (text !== "") {
    texts.push(text);
  }
  const blocks: SlackBlock[] = [];
  for (let index = 0; index < texts.length; index += 10) {
    blocks.push({
      type: "context",
      elements: texts.slice(index, index + 10).map(mrkdwn),
    });
  }
  return blocks;
}

function websiteBlocks(data: GA4WebsiteData, yesterday: string): SlackBlock[] {
  const { monthly } = data;
  const pages = new Map(data.pages.map((page) => [page.path, page]));

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
        channelLine("今月", monthly.currentMonthChannels),
        channelLine("先月", monthly.lastMonthChannels),
        sourceLine("今月", monthly.currentMonthSources),
        sourceLine("先月", monthly.lastMonthSources),
        `📅 うち昨日 ${shortDate(yesterday)} PV ${formatNumber(data.pv)} / UU ${formatNumber(data.activeUsers)}`,
        channelLine("昨日", data.dailyChannels),
        sourceLine("昨日", data.dailySources, 3),
        `🔖 ${data.property}`,
      ].join("\n"),
    ),
    ...rankingContexts([
      ...landingPageLines(
        "昨日",
        data.dailyLandingPages,
        data.dailyLandingPageSources,
        pages,
      ),
      ...landingPageLines(
        "今月",
        monthly.currentMonthLandingPages,
        monthly.currentMonthLandingPageSources,
        pages,
      ),
      ...landingPageLines(
        "先月",
        monthly.lastMonthLandingPages,
        monthly.lastMonthLandingPageSources,
        pages,
      ),
    ]),
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
        `🗓️ ${longDate(yesterday)} までの確定データ ・ 🔼🔽 は前年同期比 ・ 前年 は前年同期の PV / UU（PV＝表示回数 / UU＝アクティブユーザ / 🔗 ・ 🔎 はセッション数）`,
      ),
      divider(),
      ...ga4s.flatMap((data) => websiteBlocks(data, yesterday)),
    ],
  };
}
