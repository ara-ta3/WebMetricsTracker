import { Effect } from "effect";
import type { GA4WebsiteData } from "../../domain/GA4.js";
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

  getPVByWebsites(websites: WebsiteConfig[]): Effect.Effect<GA4WebsiteData[], Error> {
    const websitesWithGA4 = websites.filter((website) => website.metrics.ga4?.propertyId);
    
    return Effect.all(
      websitesWithGA4.map((website) =>
        Effect.promise(async () => {
          const propertyId = website.metrics.ga4!.propertyId;
          const p = await this.admin.getProperty({ name: `properties/${propertyId}` });
          const r = await this.ga4.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
            metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          });
          return {
            websiteName: website.name,
            property: p[0].displayName ?? propertyId,
            pv: Number(r[0].rows?.[0]?.metricValues?.[0]?.value ?? "0"),
            activeUsers: Number(
              r[0].rows?.[0]?.metricValues?.[1]?.value ?? "0",
            ),
          };
        }),
      ),
    );
  }
}
