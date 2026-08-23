import { Effect } from "effect";
import type {
  GA4ChannelMetrics,
  GA4Metrics,
  GA4MonthlyMetrics,
  GA4PeriodMetrics,
  GA4SourceMetrics,
  GA4WebsiteData,
} from "../../domain/GA4.js";
import type { DateRange } from "../../domain/DateRange.js";
import { monthlyDateRanges } from "../../domain/DateRange.js";
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
  ): Promise<GA4SourceMetrics[]> {
    const r = await this.ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: SOURCE_LIMIT,
    });
    return (r[0].rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "(not set)",
      medium: row.dimensionValues?.[1]?.value ?? "(not set)",
      sessions: Number(row.metricValues?.[0]?.value ?? "0"),
    }));
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
        Effect.promise(async () => {
          const propertyId = website.metrics.ga4!.propertyId;
          const p = await this.admin.getProperty({
            name: `properties/${propertyId}`,
          });
          const daily = await this.fetchMetrics(propertyId, {
            startDate: "yesterday",
            endDate: "yesterday",
          });
          const monthly = await this.fetchMonthly(propertyId, new Date());
          return {
            websiteName: website.name,
            property: p[0].displayName ?? propertyId,
            pv: daily?.pv ?? 0,
            activeUsers: daily?.activeUsers ?? 0,
            monthly,
          };
        }),
      ),
    );
  }
}
