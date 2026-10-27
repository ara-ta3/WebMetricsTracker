import { describe, it, expect } from "vitest";
import { from } from "./SlackMessage.js";
import type { GA4WebsiteData } from "./GA4.js";

const NOW = new Date("2026-08-23T00:00:00Z"); // 2026-08-23 09:00 JST

const fullData: GA4WebsiteData = {
  websiteName: "Site",
  property: "Property",
  pages: [],
  pv: 10,
  activeUsers: 5,
  dailyChannels: [],
  dailySources: [],
  dailyLandingPages: [],
  dailyLandingPageSources: [],
  monthly: {
    currentMonth: {
      range: { startDate: "2026-08-01", endDate: "2026-08-22" },
      metrics: { pv: 1200, activeUsers: 600 },
    },
    currentMonthLastYear: {
      range: { startDate: "2025-08-01", endDate: "2025-08-22" },
      metrics: { pv: 1000, activeUsers: 800 },
    },
    lastMonth: {
      range: { startDate: "2026-07-01", endDate: "2026-07-31" },
      metrics: { pv: 2000, activeUsers: 900 },
    },
    lastMonthLastYear: {
      range: { startDate: "2025-07-01", endDate: "2025-07-31" },
      metrics: { pv: 2500, activeUsers: 1000 },
    },
    currentMonthChannels: [
      { channel: "Organic Search", sessions: 600 },
      { channel: "Direct", sessions: 300 },
      { channel: "Referral", sessions: 100 },
      { channel: "Organic Social", sessions: 0 },
    ],
    lastMonthChannels: [
      { channel: "Direct", sessions: 500 },
      { channel: "Organic Search", sessions: 500 },
    ],
    currentMonthSources: [
      { source: "google", medium: "organic", sessions: 550 },
      { source: "(direct)", medium: "(none)", sessions: 300 },
      { source: "t.co", medium: "referral", sessions: 80 },
    ],
    currentMonthLandingPages: [],
    lastMonthLandingPages: [],
    currentMonthLandingPageSources: [],
    lastMonthLandingPageSources: [],
    lastMonthSources: [{ source: "google", medium: "organic", sessions: 480 }],
  },
};

const json = (data: GA4WebsiteData[]): string =>
  JSON.stringify(from(data, NOW).blocks);

describe("SlackMessage.from", () => {
  it("今月・先月を主軸にして昨日はcontextに退避する", () => {
    const blocks = from([fullData], NOW).blocks;

    expect(blocks[0]?.type).toBe("header");
    expect(blocks[1]?.elements?.[0]?.text).toContain("2026/8/22");

    const fields = blocks.find((b) => b.fields !== undefined)?.fields ?? [];
    expect(fields.length).toBe(2);
    expect(fields[0]?.text).toContain("今月 8/1〜8/22");
    expect(fields[1]?.text).toContain("先月 7/1〜7/31");

    const note = blocks.filter((b) => b.type === "context")[1];
    expect(note?.elements?.[0]?.text).toContain("うち昨日 8/22 PV 10 / UU 5");
  });

  it("前年同期比を増減の絵文字付きで表示する", () => {
    const text = json([fullData]);
    expect(text).toContain("🔼 +20.0%"); // 今月PV 1200 vs 1000
    expect(text).toContain("🔽 -25.0%"); // 今月UU 600 vs 800
    expect(text).toContain("前年 1,000 / 800"); // 今月の前年実数は同じfield内
    expect(text).toContain("前年 2,500 / 1,000"); // 先月の前年実数
  });

  it("データがない期間はデータなしと表示する", () => {
    const data: GA4WebsiteData = {
      ...fullData,
      monthly: {
        currentMonth: null,
        currentMonthLastYear: null,
        lastMonth: {
          range: { startDate: "2026-07-01", endDate: "2026-07-31" },
          metrics: { pv: 100, activeUsers: 50 },
        },
        lastMonthLastYear: {
          range: { startDate: "2025-07-01", endDate: "2025-07-31" },
          metrics: null,
        },
        currentMonthChannels: [],
        lastMonthChannels: [],
        currentMonthSources: [],
        currentMonthLandingPages: [],
        lastMonthLandingPages: [],
        currentMonthLandingPageSources: [],
        lastMonthLandingPageSources: [],
        lastMonthSources: [],
      },
    };

    const text = json([data]);
    expect(text).toContain("*今月*\\nデータなし");
    expect(text).toContain("前年 データなし");
    expect(text).toContain("今月の流入 データなし");
    expect(text).toContain("今月の詳細TOP5 データなし");
  });

  it("流入チャネルを今月・先月別に上位3件で表示する", () => {
    const text = json([fullData]);
    expect(text).toContain(
      "今月の流入 Organic Search 600 (60%) ・ Direct 300 (30%) ・ Referral 100 (10%)",
    );
    expect(text).toContain(
      "先月の流入 Direct 500 (50%) ・ Organic Search 500 (50%)",
    );
    expect(text).not.toContain("Organic Social");
  });

  it("参照元/メディアの詳細を今月・先月別に表示する", () => {
    const text = json([fullData]);
    expect(text).toContain(
      "今月の詳細TOP5 google/organic 550 ・ (direct)/(none) 300 ・ t.co/referral 80",
    );
    expect(text).toContain("先月の詳細TOP5 google/organic 480");
  });

  it("対象サイトが無い場合もメッセージを組み立てる", () => {
    const blocks = from([], NOW).blocks;
    expect(blocks.length).toBe(2);
    expect(blocks[1]?.text?.text).toContain("データなし");
  });

  it("昨日の流入チャネルと参照元/メディアは3件まで表示する", () => {
    const blocks = from(
      [
        {
          ...fullData,
          dailyChannels: [
            { channel: "Organic Search", sessions: 60 },
            { channel: "Direct", sessions: 20 },
            { channel: "Referral", sessions: 10 },
            { channel: "Organic Social", sessions: 10 },
          ],
          dailySources: [
            { source: "google", medium: "organic", sessions: 60 },
            { source: "(direct)", medium: "(none)", sessions: 20 },
            { source: "example.com", medium: "referral", sessions: 10 },
            { source: "t.co", medium: "referral", sessions: 10 },
          ],
        },
      ],
      NOW,
    ).blocks;

    expect(blocks[4]?.type).toBe("context");
    expect(blocks[4]?.elements?.[0]?.text).toContain(
      "🔗 昨日の流入 Organic Search 60 (60%) ・ Direct 20 (20%) ・ Referral 10 (10%)\n🔎 昨日の詳細TOP3 google/organic 60 ・ (direct)/(none) 20 ・ example.com/referral 10",
    );
  });

  it("LPとLP×参照元/メディアを独立した上位3件で表示する", () => {
    const blocks = from(
      [
        {
          ...fullData,
          dailyLandingPages: [
            { landingPage: "/a", sessions: 1200 },
            { landingPage: "/b", sessions: 900 },
            { landingPage: "/c", sessions: 700 },
            { landingPage: "/d", sessions: 500 },
          ],
          dailyLandingPageSources: [
            {
              landingPage: "/b",
              source: "google",
              medium: "organic",
              sessions: 900,
            },
            {
              landingPage: "/a",
              source: "google",
              medium: "organic",
              sessions: 800,
            },
            {
              landingPage: "/a",
              source: "(direct)",
              medium: "(none)",
              sessions: 400,
            },
            {
              landingPage: "/c",
              source: "t.co",
              medium: "referral",
              sessions: 300,
            },
          ],
        },
      ],
      NOW,
    ).blocks;

    expect(blocks[5]).toEqual({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "📄 昨日のLP TOP3（セッション数）\n1. /a — 1,200\n2. /b — 900\n3. /c — 700\n🔎 昨日のLP×流入経路詳細 TOP3（セッション数）\n1. /b × google/organic — 900\n2. /a × google/organic — 800\n3. /a × (direct)/(none) — 400\n📄 今月のLP TOP3（セッション数）\nデータなし\n🔎 今月のLP×流入経路詳細 TOP3（セッション数）\nデータなし\n📄 先月のLP TOP3（セッション数）\nデータなし\n🔎 先月のLP×流入経路詳細 TOP3（セッション数）\nデータなし",
        },
      ],
    });
  });

  it("今月と先月のLP集計も各期間のデータで表示する", () => {
    const text = json([
      {
        ...fullData,
        monthly: {
          ...fullData.monthly,
          currentMonthLandingPages: [
            { landingPage: "/current", sessions: 500 },
          ],
          lastMonthLandingPages: [{ landingPage: "/previous", sessions: 800 }],
          currentMonthLandingPageSources: [
            {
              landingPage: "/current",
              source: "google",
              medium: "organic",
              sessions: 400,
            },
          ],
          lastMonthLandingPageSources: [
            {
              landingPage: "/previous",
              source: "t.co",
              medium: "referral",
              sessions: 600,
            },
          ],
        },
      },
    ]);

    expect(text).toContain("今月のLP TOP3（セッション数）\\n1. /current — 500");
    expect(text).toContain(
      "先月のLP TOP3（セッション数）\\n1. /previous — 800",
    );
    expect(text).toContain(
      "今月のLP×流入経路詳細 TOP3（セッション数）\\n1. /current × google/organic — 400",
    );
    expect(text).toContain(
      "先月のLP×流入経路詳細 TOP3（セッション数）\\n1. /previous × t.co/referral — 600",
    );
  });

  it("昨日の流入とLPが空の場合はデータなしを表示する", () => {
    const text = json([fullData]);

    expect(text).toContain("昨日の流入 データなし");
    expect(text).toContain("昨日の詳細TOP3 データなし");
    expect(text).toContain("昨日のLP TOP3（セッション数）\\nデータなし");
    expect(text).toContain(
      "昨日のLP×流入経路詳細 TOP3（セッション数）\\nデータなし",
    );
  });

  it("LPをパスとタイトル付きのリンクで表示する", () => {
    const blocks = from(
      [
        {
          ...fullData,
          pages: [
            {
              path: "/article",
              url: "https://example.com/article",
              title: "記事 & <解説> | 入門",
            },
          ],
          dailyLandingPages: [{ landingPage: "/article", sessions: 120 }],
          dailyLandingPageSources: [
            {
              landingPage: "/article",
              source: "google",
              medium: "organic",
              sessions: 100,
            },
          ],
        },
      ],
      NOW,
    ).blocks;

    expect(blocks[5]?.type).toBe("context");
    expect(blocks[5]?.elements?.[0]?.text).toContain(
      "1. <https://example.com/article|/article (記事 &amp; &lt;解説&gt; ｜ 入門)> — 120",
    );
    expect(blocks[5]?.elements?.[0]?.text).toContain(
      "1. <https://example.com/article|/article (記事 &amp; &lt;解説&gt; ｜ 入門)> × google/organic — 100",
    );
  });

  it("タイトルがないLPはパスをラベルにしたリンクで表示する", () => {
    const blocks = from(
      [
        {
          ...fullData,
          pages: [
            {
              path: "/article",
              url: "https://example.com/article",
              title: null,
            },
          ],
          dailyLandingPages: [{ landingPage: "/article", sessions: 120 }],
        },
      ],
      NOW,
    ).blocks;

    expect(blocks[5]?.elements?.[0]?.text).toContain(
      "<https://example.com/article|/article> — 120",
    );
  });

  it("8サイトのレポートを35ブロックにまとめる", () => {
    const blocks = from(
      Array.from({ length: 8 }, () => fullData),
      NOW,
    ).blocks;

    expect(blocks.length).toBe(35);
  });

  it("長いリンクでもMarkdownの途中を切らず3000文字以内のテキストに分ける", () => {
    const path = `/${"a".repeat(1700)}`;
    const blocks = from(
      [
        {
          ...fullData,
          pages: [
            {
              path,
              url: `https://example.com${path}`,
              title: "長いパスの記事",
            },
          ],
          dailyLandingPages: [{ landingPage: path, sessions: 120 }],
          dailyLandingPageSources: [
            {
              landingPage: path,
              source: "google",
              medium: "organic",
              sessions: 100,
            },
          ],
        },
      ],
      NOW,
    ).blocks;

    expect(blocks[5]?.type).toBe("context");
    expect(blocks[5]?.elements?.length).toBe(2);
    expect(blocks[5]?.elements?.[0]?.text.length).toBeLessThanOrEqual(3000);
    expect(blocks[5]?.elements?.[1]?.text.length).toBeLessThanOrEqual(3000);
    expect(blocks[5]?.elements?.[0]?.text).toContain(
      `<https://example.com${path}|`,
    );
    expect(blocks[5]?.elements?.[1]?.text).toContain(
      "> × google/organic — 100",
    );
  });
});
