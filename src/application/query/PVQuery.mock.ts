import { Effect } from "effect";
import type { PVQuery } from "../query/PVQuery.js";
import type { GA4WebsiteData } from "../../domain/GA4.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";

export class MockPVQuery implements PVQuery {
  constructor(private readonly samplePv: number = 100) {}

  getPVByWebsites(websites: WebsiteConfig[]): Effect.Effect<GA4WebsiteData[], Error> {
    const websitesWithGA4 = websites.filter((website) => website.metrics.ga4?.propertyId);
    const data: GA4WebsiteData[] = websitesWithGA4.map((website) => ({
      websiteName: website.name,
      property: website.metrics.ga4!.propertyId,
      pv: this.samplePv,
      activeUsers: this.samplePv / 2,
    }));
    return Effect.succeed(data);
  }
}
