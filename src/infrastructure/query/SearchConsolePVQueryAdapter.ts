import { Effect } from "effect";
import type { SearchConsoleWebsiteData } from "../../domain/SearchConsole.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";
import type { SearchConsoleQuery } from "../../application/query/SearchConsoleQuery.js";
import { google } from "googleapis";
import { inject, injectable } from "inversify";
import { TYPES } from "../../config/Types.js";

@injectable()
export class SearchConsolePVQueryAdapter implements SearchConsoleQuery {
  private readonly auth: any;
  private readonly webmasters: any;

  constructor(@inject(TYPES.config.GoogleKeyFilePath) path: string) {
    this.auth = new google.auth.GoogleAuth({
      keyFile: path,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    this.webmasters = google.webmasters({
      version: "v3",
      auth: this.auth,
    });
  }

  getSearchConsoleDataByWebsites(
    websites: WebsiteConfig[],
  ): Effect.Effect<SearchConsoleWebsiteData[], Error> {
    const websitesWithSearchConsole = websites.filter(
      (website) => website.metrics.searchConsole?.siteUrl,
    );

    return Effect.all(
      websitesWithSearchConsole.map((website) =>
        Effect.promise(async () => {
          const siteUrl = website.metrics.searchConsole!.siteUrl;
          const result = await this.webmasters.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: {
              startDate: "yesterday",
              endDate: "yesterday",
              dimensions: [],
              rowLimit: 1,
            },
          });

          const row = result.data.rows?.[0];
          return {
            websiteName: website.name,
            siteUrl: siteUrl,
            clicks: row?.clicks || 0,
            impressions: row?.impressions || 0,
            ctr: row?.ctr || 0,
            position: row?.position || 0,
          };
        }),
      ),
    );
  }
}
