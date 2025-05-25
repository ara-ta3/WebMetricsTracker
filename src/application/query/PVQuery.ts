import type { Effect } from "effect";
import type { GA4Data } from "../../domain/GA4.js";

export interface PVQuery {
  getPV(propeties: string[]): Effect.Effect<GA4Data[], Error>;
}
