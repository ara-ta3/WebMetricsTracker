import { describe, it, expect } from "vitest";
import { from } from "./SlackMessage.js";
import type { GA4WebsiteData } from "./GA4.js";

const texts = (data: GA4WebsiteData[]): string =>
  JSON.stringify(from(data).blocks);

describe("SlackMessage.from", () => {
  it("月次のPV・アクティブユーザと前年比を表示する", () => {
    const data: GA4WebsiteData = {
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

    const json = texts([data]);
    expect(json).toContain("2026-08-01 〜 2026-08-22");
    expect(json).toContain("1,200");
    expect(json).toContain("+20.0%");
    expect(json).toContain("-20.0%");
  });

  it("データがない場合はデータなしと表示する", () => {
    const data: GA4WebsiteData = {
      websiteName: "Site",
      property: "Property",
      pv: 0,
      activeUsers: 0,
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

    const json = texts([data]);
    expect(json).toContain("データなし");
    expect(json).toContain("前年同期: データなし");
  });
});
