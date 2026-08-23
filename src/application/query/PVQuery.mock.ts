import { Effect } from "effect";
import type { PVQuery } from "../query/PVQuery.js";
import type { GA4MonthlyMetrics, GA4WebsiteData } from "../../domain/GA4.js";
import { monthlyDateRanges } from "../../domain/DateRange.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";

export class MockPVQuery implements PVQuery {
  constructor(private readonly samplePv: number = 100) {}

  private monthly(): GA4MonthlyMetrics {
    const ranges = monthlyDateRanges(new Date());
    const metrics = {
      pv: this.samplePv * 30,
      activeUsers: (this.samplePv / 2) * 30,
    };
    return {
      currentMonth:
        ranges.currentMonth === null
          ? null
          : { range: ranges.currentMonth, metrics },
      currentMonthLastYear:
        ranges.currentMonthLastYear === null
          ? null
          : { range: ranges.currentMonthLastYear, metrics },
      lastMonth: { range: ranges.lastMonth, metrics },
      lastMonthLastYear: { range: ranges.lastMonthLastYear, metrics: null },
    };
  }

  getPVByWebsites(
    websites: WebsiteConfig[],
  ): Effect.Effect<GA4WebsiteData[], Error> {
    const websitesWithGA4 = websites.filter(
      (website) => website.metrics.ga4?.propertyId,
    );
    const data: GA4WebsiteData[] = websitesWithGA4.map((website) => ({
      websiteName: website.name,
      property: website.metrics.ga4!.propertyId,
      pv: this.samplePv,
      activeUsers: this.samplePv / 2,
      monthly: this.monthly(),
    }));
    return Effect.succeed(data);
  }
}
