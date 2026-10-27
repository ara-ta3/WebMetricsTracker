import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { protos } from "@google-analytics/data";
import { Ga4PVQueryAdapter } from "./GA4PVQueryAdapter.js";

const { runReport, getProperty } = vi.hoisted(() => ({
  runReport:
    vi.fn<
      (
        request: protos.google.analytics.data.v1beta.IRunReportRequest,
      ) => Promise<[protos.google.analytics.data.v1beta.IRunReportResponse]>
    >(),
  getProperty: vi.fn(),
}));

vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runReport = runReport;
  },
}));

vi.mock("@google-analytics/admin", () => ({
  AnalyticsAdminServiceClient: class {
    getProperty = getProperty;
  },
}));

const websites = [{ name: "Site", metrics: { ga4: { propertyId: "123" } } }];

describe("Ga4PVQueryAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T16:00:00Z"));
    vi.resetAllMocks();
    getProperty.mockResolvedValue([{ displayName: "Property" }]);
    runReport.mockResolvedValue([{}]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("昨日の参照元と各期間のLP・LP×参照元をセッション数順の3件で取得する", async () => {
    const adapter = new Ga4PVQueryAdapter("unused.json");

    await Effect.runPromise(adapter.getPVByWebsites(websites));

    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2026-08-22", endDate: "2026-08-22" }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2026-08-22", endDate: "2026-08-22" }],
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2026-08-01", endDate: "2026-08-22" }],
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2026-07-01", endDate: "2026-07-31" }],
      dimensions: [
        { name: "landingPage" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
  });

  it("GA4のLPと参照元の値を通知に渡す型へ変換する", async () => {
    runReport.mockImplementation(async (request) => {
      if (request.dimensions?.length === 3) {
        return [
          {
            rows: [
              {
                dimensionValues: [
                  { value: "/article" },
                  { value: "google" },
                  { value: "organic" },
                ],
                metricValues: [{ value: "42" }],
              },
            ],
          },
        ];
      }
      if (request.dimensions?.[0]?.name === "landingPage") {
        return [
          {
            rows: [
              {
                dimensionValues: [{ value: "/article" }],
                metricValues: [{ value: "50" }],
              },
            ],
          },
        ];
      }
      if (request.dimensions?.[0]?.name === "sessionSource") {
        return [
          {
            rows: [
              {
                dimensionValues: [{ value: "google" }, { value: "organic" }],
                metricValues: [{ value: "80" }],
              },
            ],
          },
        ];
      }
      if (request.dimensions?.[0]?.name === "sessionDefaultChannelGroup") {
        return [
          {
            rows: [
              {
                dimensionValues: [{ value: "Organic Search" }],
                metricValues: [{ value: "80" }],
              },
            ],
          },
        ];
      }
      return [{}];
    });
    const adapter = new Ga4PVQueryAdapter("unused.json");

    const [data] = await Effect.runPromise(adapter.getPVByWebsites(websites));

    expect(data?.dailyChannels).toEqual([
      { channel: "Organic Search", sessions: 80 },
    ]);
    expect(data?.dailySources).toEqual([
      { source: "google", medium: "organic", sessions: 80 },
    ]);
    expect(data?.dailyLandingPages).toEqual([
      { landingPage: "/article", sessions: 50 },
    ]);
    expect(data?.dailyLandingPageSources).toEqual([
      {
        landingPage: "/article",
        source: "google",
        medium: "organic",
        sessions: 42,
      },
    ]);
    expect(data?.monthly.currentMonthLandingPages).toEqual([
      { landingPage: "/article", sessions: 50 },
    ]);
    expect(data?.monthly.lastMonthLandingPageSources).toEqual([
      {
        landingPage: "/article",
        source: "google",
        medium: "organic",
        sessions: 42,
      },
    ]);
  });

  it("月初は当月のLP集計を取得せず昨日と先月を取得する", async () => {
    vi.setSystemTime(new Date("2026-08-31T16:00:00Z"));
    const adapter = new Ga4PVQueryAdapter("unused.json");

    const [data] = await Effect.runPromise(adapter.getPVByWebsites(websites));

    expect(data?.dailyLandingPages).toEqual([]);
    expect(data?.dailyLandingPageSources).toEqual([]);
    expect(data?.monthly.currentMonthLandingPages).toEqual([]);
    expect(data?.monthly.currentMonthLandingPageSources).toEqual([]);
    expect(runReport).not.toHaveBeenCalledWith(
      expect.objectContaining({
        dateRanges: [expect.objectContaining({ startDate: "2026-09-01" })],
      }),
    );
    expect(runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRanges: [{ startDate: "2026-08-31", endDate: "2026-08-31" }],
        dimensions: [{ name: "landingPage" }],
      }),
    );
  });

  it("LPの順位を変えずにページのURLと代表タイトルを付加する", async () => {
    runReport.mockImplementation(async (request) => {
      if (request.dimensions?.[0]?.name === "pagePath") {
        return [
          {
            rows: [
              {
                dimensionValues: [
                  { value: "/article" },
                  {
                    value: "https://example.com/article?utm_source=google#top",
                  },
                  { value: "記事タイトル" },
                ],
                metricValues: [{ value: "80" }],
              },
              {
                dimensionValues: [
                  { value: "/article" },
                  { value: "https://example.com/article" },
                  { value: "別のタイトル" },
                ],
                metricValues: [{ value: "20" }],
              },
              {
                dimensionValues: [
                  { value: "/untitled" },
                  { value: "https://example.com/untitled" },
                  { value: "(not set)" },
                ],
                metricValues: [{ value: "10" }],
              },
              {
                dimensionValues: [
                  { value: "/invalid" },
                  { value: "javascript:alert(1)" },
                  { value: "無効なURL" },
                ],
                metricValues: [{ value: "5" }],
              },
            ],
          },
        ];
      }
      if (
        request.dimensions?.[0]?.name === "landingPage" &&
        request.dimensions.length === 1
      ) {
        return [
          {
            rows: [
              {
                dimensionValues: [{ value: "/article" }],
                metricValues: [{ value: "50" }],
              },
              {
                dimensionValues: [{ value: "/untitled" }],
                metricValues: [{ value: "30" }],
              },
              {
                dimensionValues: [{ value: "/invalid" }],
                metricValues: [{ value: "5" }],
              },
            ],
          },
        ];
      }
      return [{}];
    });
    const adapter = new Ga4PVQueryAdapter("unused.json");

    const [data] = await Effect.runPromise(adapter.getPVByWebsites(websites));

    expect(data?.pages).toEqual([
      {
        path: "/article",
        url: "https://example.com/article",
        title: "記事タイトル",
      },
      { path: "/untitled", url: "https://example.com/untitled", title: null },
    ]);
    expect(data?.dailyLandingPages).toEqual([
      { landingPage: "/article", sessions: 50 },
      { landingPage: "/untitled", sessions: 30 },
      { landingPage: "/invalid", sessions: 5 },
    ]);
    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2026-07-01", endDate: "2026-08-22" }],
      dimensions: [
        { name: "pagePath" },
        { name: "pageLocation" },
        { name: "pageTitle" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          inListFilter: {
            values: ["/article", "/untitled", "/invalid"],
            caseSensitive: true,
          },
        },
      },
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });
  });
});
