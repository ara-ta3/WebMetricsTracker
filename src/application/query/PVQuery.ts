import type { Effect } from "effect";
import type { GA4WebsiteData } from "../../domain/GA4.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";

export interface PVQuery {
  getPVByWebsites(
    websites: WebsiteConfig[],
  ): Effect.Effect<GA4WebsiteData[], Error>;
}
