import { describe, it, expect } from "vitest";
import { monthlyDateRanges } from "./DateRange.js";

describe("monthlyDateRanges", () => {
  it("月中の場合は当月を月初〜前日で返す", () => {
    // 2026-08-23 09:00 JST
    const ranges = monthlyDateRanges(new Date("2026-08-23T00:00:00Z"));

    expect(ranges.currentMonth).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-22",
    });
    expect(ranges.currentMonthLastYear).toEqual({
      startDate: "2025-08-01",
      endDate: "2025-08-22",
    });
    expect(ranges.lastMonth).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(ranges.lastMonthLastYear).toEqual({
      startDate: "2025-07-01",
      endDate: "2025-07-31",
    });
  });

  it("JSTで日付が変わる時刻を考慮する", () => {
    // 2026-08-01 08:00 JST (UTC では 2026-07-31)
    const ranges = monthlyDateRanges(new Date("2026-07-31T23:00:00Z"));

    expect(ranges.currentMonth).toBeNull();
    expect(ranges.currentMonthLastYear).toBeNull();
    expect(ranges.lastMonth).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
  });

  it("1月の場合は先月が前年12月になる", () => {
    const ranges = monthlyDateRanges(new Date("2026-01-15T00:00:00Z"));

    expect(ranges.currentMonth).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-01-14",
    });
    expect(ranges.lastMonth).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
    expect(ranges.lastMonthLastYear).toEqual({
      startDate: "2024-12-01",
      endDate: "2024-12-31",
    });
  });

  it("うるう年の2月29日は前年では2月28日に丸める", () => {
    // 2024-03-01 00:00 JST -> 前日が前月なので当月分はまだデータなし
    const ranges = monthlyDateRanges(new Date("2024-02-29T15:00:00Z"));
    expect(ranges.currentMonth).toBeNull();
    expect(ranges.lastMonth).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });

    // 2024-02-29 中の実行
    const feb = monthlyDateRanges(new Date("2024-02-29T00:00:00Z"));
    expect(feb.currentMonth).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-28",
    });
    expect(feb.currentMonthLastYear).toEqual({
      startDate: "2023-02-01",
      endDate: "2023-02-28",
    });
  });

  it("月末実行時に前年の同月が短い場合は月末に丸める", () => {
    // 2025-03-31 09:00 JST -> 前日 2025-03-30
    const ranges = monthlyDateRanges(new Date("2025-03-31T00:00:00Z"));
    expect(ranges.currentMonth).toEqual({
      startDate: "2025-03-01",
      endDate: "2025-03-30",
    });
    expect(ranges.currentMonthLastYear).toEqual({
      startDate: "2024-03-01",
      endDate: "2024-03-30",
    });
  });
});
