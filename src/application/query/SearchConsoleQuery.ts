import type { Effect } from "effect";
import type { SearchConsoleWebsiteData } from "../../domain/SearchConsole.js";
import type { WebsiteConfig } from "../../domain/WebsiteConfig.js";

export interface SearchConsoleQuery {
  getSearchConsoleDataByWebsites(
    websites: WebsiteConfig[],
  ): Effect.Effect<SearchConsoleWebsiteData[], Error>;
}
