import { Effect, pipe } from "effect";
import type { GA4Data } from "../../domain/GA4.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import type { PVQuery } from "../../application/query/PVQuery.js";

export class Ga4PVQueryAdapter implements PVQuery {
  readonly ga4: BetaAnalyticsDataClient;
  readonly admin: AnalyticsAdminServiceClient;

  constructor(path: string) {
    this.ga4 = new BetaAnalyticsDataClient({
      keyFilename: path,
    });
    this.admin = new AnalyticsAdminServiceClient({
      keyFilename: path,
    });
  }

  private getProperty(id: string): Effect.Effect<string, Error> {
    return Effect.async((resume) => {
      this.admin
        .getProperty({ name: `properties/${id}` })
        .then((p) => resume(Effect.succeed(p[0].displayName ?? id)))
        .catch((err) => resume(Effect.fail(err as Error)));
    });
  }

  private getReport(id: string): Effect.Effect<
    {
      property: string;
      pv: number;
      activeUsers: number;
    },
    Error
  > {
    return Effect.async((resume) => {
      this.ga4
        .runReport({
          property: `properties/${id}`,
          dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        })
        .then((p) => {
          if (
            p[0]?.rows === undefined ||
            p[0]?.rows === null ||
            p[0]?.rows?.length === 0
          ) {
            return resume(
              Effect.fail(new Error("No data returned. for id: " + id))
            );
          }
          const row = p[0].rows[0];
          if (
            row?.metricValues === undefined ||
            row?.metricValues === null ||
            row?.metricValues.length === 0
          ) {
            return resume(
              Effect.fail(new Error("No metric values returned. for id: " + id))
            );
          }
          return resume(
            Effect.succeed({
              property: id,
              pv: Number(row.metricValues[0]?.value ?? "0"),
              activeUsers: Number(row.metricValues[1]?.value ?? "0"),
            })
          );
        })
        .catch((err) => {
          resume(Effect.fail(err as Error));
        });
    });
  }

  getPV(properties: string[]): Effect.Effect<GA4Data[], Error> {
    return Effect.all(
      properties.map((id) =>
        pipe(
          this.getProperty(id),
          Effect.flatMap((propertyName) => {
            return this.getReport(id).pipe(
              Effect.map((report) => ({
                ...report,
                property: propertyName,
              }))
            );
          })
        )
      )
    );
  }
}
