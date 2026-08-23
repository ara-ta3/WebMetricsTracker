import { Effect } from "effect";
import type {
  GA4Metrics,
  GA4MonthlyMetrics,
  GA4PeriodMetrics,
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
    const [currentMonth, currentMonthLastYear, lastMonth, lastMonthLastYear] =
      await Promise.all([
        ranges.currentMonth === null
          ? Promise.resolve(null)
          : this.fetchPeriod(propertyId, ranges.currentMonth),
        ranges.currentMonthLastYear === null
          ? Promise.resolve(null)
          : this.fetchPeriod(propertyId, ranges.currentMonthLastYear),
        this.fetchPeriod(propertyId, ranges.lastMonth),
        this.fetchPeriod(propertyId, ranges.lastMonthLastYear),
      ]);
    return {
      currentMonth,
      currentMonthLastYear,
      lastMonth,
      lastMonthLastYear,
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
