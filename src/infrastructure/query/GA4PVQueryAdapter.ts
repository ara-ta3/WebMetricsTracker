import { Effect } from "effect";
import type { GA4Data } from "../../domain/GA4.js";
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

  getPV(properties: string[]): Effect.Effect<GA4Data[], Error> {
    return Effect.all(
      properties.map((id) =>
        Effect.promise(async () => {
          const p = await this.admin.getProperty({ name: `properties/${id}` });
          const r = await this.ga4.runReport({
            property: `properties/${id}`,
            dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
            metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          });
          return {
            property: p[0].displayName ?? id,
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
