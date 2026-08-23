import { describe, it, expect } from "vitest";
import { from } from "./SlackMessage.js";
import type { GA4WebsiteData } from "./GA4.js";

const NOW = new Date("2026-08-23T00:00:00Z"); // 2026-08-23 09:00 JST

const fullData: GA4WebsiteData = {
  websiteName: "Site",
  property: "Property",
  pv: 10,
  activeUsers: 5,
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
      },
    };

    const text = json([data]);
    expect(text).toContain("*今月*\\nデータなし");
    expect(text).toContain("前年 データなし");
  });

  it("対象サイトが無い場合もメッセージを組み立てる", () => {
    const blocks = from([], NOW).blocks;
    expect(blocks.length).toBe(2);
    expect(blocks[1]?.text?.text).toContain("データなし");
  });
});
