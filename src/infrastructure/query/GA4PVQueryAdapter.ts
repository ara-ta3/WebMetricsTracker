import { Effect } from "effect";
import type { GA4Data } from "../../domain/GA4.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { PVQuery } from "../../application/query/PVQuery.js";

export class Ga4PVQueryAdapter implements PVQuery {
  readonly ga4: BetaAnalyticsDataClient;
  constructor(path: string) {
    this.ga4 = new BetaAnalyticsDataClient({
      keyFilename: path,
    });
  }

  getPV(properties: string[]): Effect.Effect<GA4Data[], Error> {
    return Effect.async((resume) => {
      Promise.all(
        properties.map((id) =>
          this.ga4.runReport({
            property: `properties/${id}`,
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            metrics: [{ name: "screenPageViews" }],
          })
        )
      )
        .then((reports) => {
          const result: GA4Data[] = reports.map(([report], i) => {
            console.log(report);
            return {
              property: properties[i]!,
              pv: Number(report.rows?.[0]?.metricValues?.[0]?.value ?? "0"),
            };
          });
          resume(Effect.succeed(result));
        })
        .catch((err) => resume(Effect.fail(err as Error)));
    });
  }
}
