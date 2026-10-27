import { Effect } from "effect";
import type {
  GA4ChannelMetrics,
  GA4LandingPageMetrics,
  GA4LandingPageSourceMetrics,
  GA4Metrics,
  GA4PageDetails,
  GA4MonthlyMetrics,
  GA4PeriodMetrics,
  GA4SourceMetrics,
  GA4WebsiteData,
} from "../../domain/GA4.js";
import type { DateRange } from "../../domain/DateRange.js";
import { monthlyDateRanges, yesterdayInJst } from "../../domain/DateRange.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import type { PVQuery } from "../../application/query/PVQuery.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../../config/Types.js";

/** 参照元/メディアの取得上限 */
const SOURCE_LIMIT = 5;

@injectable()
export class Ga4PVQueryAdapter implements PVQuery {
  readonly ga4: BetaAnalyticsDataClient;
  readonly admin: AnalyticsAdminServiceClient;

  constructor(@inject(TYPES.config.GoogleKeyFilePath) path: string) {
    this.ga4 = new BetaAnalyticsDataClient({
      keyFilename: path,
    });
    this.admin = new AnalyticsAdminServiceClient({
      keyFilename: path,
    });
  }

  private async fetchMetrics(
    propertyId: string,
    range: DateRange,
  ): Promise<GA4Metrics | null> {
    const r = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    });
    const values = r[0].rows?.[0]?.metricValues;
    if (!values) {
      return null;
    }
    return {
      pv: Number(values[0]?.value ?? "0"),
      activeUsers: Number(values[1]?.value ?? "0"),
    };
  }

  /** チャネルグループ別のセッション数を上位順で取得する（比率算出のため全チャネル） */
  private async fetchChannels(
    propertyId: string,
    range: DateRange,
  ): Promise<GA4ChannelMetrics[]> {
    const r = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    return (r[0].rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "(not set)",
      sessions: Number(row.metricValues?.[0]?.value ?? "0"),
    }));
  }

  /** 参照元/参照メディア別のセッション数を上位順で取得する */
  private async fetchSources(
    propertyId: string,
    range: DateRange,
    limit: number = SOURCE_LIMIT,
  ): Promise<GA4SourceMetrics[]> {
    const r = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });
    return (r[0].rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "(not set)",
      medium: row.dimensionValues?.[1]?.value ?? "(not set)",
      sessions: Number(row.metricValues?.[0]?.value ?? "0"),
    }));
  }

  private async fetchLandingPages(
    propertyId: string,
    range: DateRange,
  ): Promise<GA4LandingPageMetrics[]> {
    const [report] = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
    return (report.rows ?? []).map((row) => ({
      landingPage: row.dimensionValues?.[0]?.value ?? "(not set)",
      sessions: Number(row.metricValues?.[0]?.value ?? "0"),
    }));
  }

  private async fetchLandingPageSources(
    propertyId: string,
    range: DateRange,
  ): Promise<GA4LandingPageSourceMetrics[]> {
    const [report] = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [
        { name: "landingPage" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 3,
    });
    return (report.rows ?? []).map((row) => ({
      landingPage: row.dimensionValues?.[0]?.value ?? "(not set)",
      source: row.dimensionValues?.[1]?.value ?? "(not set)",
      medium: row.dimensionValues?.[2]?.value ?? "(not set)",
      sessions: Number(row.metricValues?.[0]?.value ?? "0"),
    }));
  }

  private async fetchPageDetails(
    propertyId: string,
    range: DateRange,
    paths: string[],
  ): Promise<GA4PageDetails[]> {
    if (paths.length === 0) {
      return [];
    }
    const [report] = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [
        { name: "pagePath" },
        { name: "pageLocation" },
        { name: "pageTitle" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          inListFilter: { values: paths, caseSensitive: true },
        },
      },
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });
    const pages = new Map<string, GA4PageDetails>();
    for (const row of report.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value;
      const location = row.dimensionValues?.[1]?.value;
      if (!path || !location || pages.has(path)) {
        continue;
      }
      const url = URL.parse(location);
      if (
        url === null ||
        (url.protocol !== "https:" && url.protocol !== "http:")
      ) {
        continue;
      }
      url.search = "";
      url.hash = "";
      const title = row.dimensionValues?.[2]?.value;
      pages.set(path, {
        path,
        url: url.href,
        title: title && title !== "(not set)" ? title : null,
      });
    }
    return [...pages.values()];
  }

  private async fetchPeriod(
    propertyId: string,
    range: DateRange,
  ): Promise<GA4PeriodMetrics> {
    return {
      range,
      metrics: await this.fetchMetrics(propertyId, range),
    };
  }

  private async fetchMonthly(
    propertyId: string,
    now: Date,
  ): Promise<GA4MonthlyMetrics> {
    const ranges = monthlyDateRanges(now);
    const [
      currentMonth,
      currentMonthLastYear,
      lastMonth,
      lastMonthLastYear,
      currentMonthChannels,
      lastMonthChannels,
      currentMonthSources,
      lastMonthSources,
      currentMonthLandingPages,
      lastMonthLandingPages,
      currentMonthLandingPageSources,
      lastMonthLandingPageSources,
    ] = await Promise.all([
      ranges.currentMonth === null
        ? Promise.resolve(null)
        : this.fetchPeriod(propertyId, ranges.currentMonth),
      ranges.currentMonthLastYear === null
        ? Promise.resolve(null)
        : this.fetchPeriod(propertyId, ranges.currentMonthLastYear),
      this.fetchPeriod(propertyId, ranges.lastMonth),
      this.fetchPeriod(propertyId, ranges.lastMonthLastYear),
      ranges.currentMonth === null
        ? Promise.resolve([])
        : this.fetchChannels(propertyId, ranges.currentMonth),
      this.fetchChannels(propertyId, ranges.lastMonth),
      ranges.currentMonth === null
        ? Promise.resolve([])
        : this.fetchSources(propertyId, ranges.currentMonth),
      this.fetchSources(propertyId, ranges.lastMonth),
      ranges.currentMonth === null
        ? Promise.resolve([])
        : this.fetchLandingPages(propertyId, ranges.currentMonth),
      this.fetchLandingPages(propertyId, ranges.lastMonth),
      ranges.currentMonth === null
        ? Promise.resolve([])
        : this.fetchLandingPageSources(propertyId, ranges.currentMonth),
      this.fetchLandingPageSources(propertyId, ranges.lastMonth),
    ]);
    return {
      currentMonth,
      currentMonthLastYear,
      lastMonth,
      lastMonthLastYear,
      currentMonthChannels,
      lastMonthChannels,
      currentMonthSources,
      lastMonthSources,
      currentMonthLandingPages,
      lastMonthLandingPages,
      currentMonthLandingPageSources,
      lastMonthLandingPageSources,
    };
  }

  getPVByWebsites(
    websites: WebsiteConfig[],
  ): Effect.Effect<GA4WebsiteData[], Error> {
    const websitesWithGA4 = websites.filter(
      (website) => website.metrics.ga4?.propertyId,
    );

    return Effect.all(
      websitesWithGA4.map((website) =>
        Effect.tryPromise({
          try: async () => {
            const propertyId = website.metrics.ga4!.propertyId;
            const p = await this.admin.getProperty({
              name: `properties/${propertyId}`,
            });
            const now = new Date();
            const yesterday = yesterdayInJst(now);
            const range = { startDate: yesterday, endDate: yesterday };
            const [
              daily,
              dailyChannels,
              dailySources,
              dailyLandingPages,
              dailyLandingPageSources,
              monthly,
            ] = await Promise.all([
              this.fetchMetrics(propertyId, range),
              this.fetchChannels(propertyId, range),
              this.fetchSources(propertyId, range, 3),
              this.fetchLandingPages(propertyId, range),
              this.fetchLandingPageSources(propertyId, range),
              this.fetchMonthly(propertyId, now),
            ]);
            const paths = [
              ...new Set(
                [
                  ...dailyLandingPages,
                  ...dailyLandingPageSources,
                  ...monthly.currentMonthLandingPages,
                  ...monthly.currentMonthLandingPageSources,
                  ...monthly.lastMonthLandingPages,
                  ...monthly.lastMonthLandingPageSources,
                ]
                  .map((page) => page.landingPage)
                  .filter((path) => path.startsWith("/")),
              ),
            ];
            const pages = await this.fetchPageDetails(
              propertyId,
              {
                startDate: monthly.lastMonth.range.startDate,
                endDate: yesterday,
              },
              paths,
            );
            return {
              websiteName: website.name,
              property: p[0].displayName ?? propertyId,
              pages,
              pv: daily?.pv ?? 0,
              activeUsers: daily?.activeUsers ?? 0,
              dailyChannels,
              dailySources,
              dailyLandingPages,
              dailyLandingPageSources,
              monthly,
            };
          },
          catch: (err) => (err instanceof Error ? err : new Error(String(err))),
        }),
      ),
    );
  }
}
