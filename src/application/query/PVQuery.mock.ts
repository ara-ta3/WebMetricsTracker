import { Effect } from "effect";
import type { PVQuery } from "../query/PVQuery.js";
import type { GA4Data } from "../../domain/GA4.js";

export class MockPVQuery implements PVQuery {
  constructor(private readonly samplePv: number = 100) {}

  getPV(properties: string[]): Effect.Effect<GA4Data[], Error> {
    const data: GA4Data[] = properties.map((property) => ({
      property,
      pv: this.samplePv,
      activeUsers: this.samplePv / 2,
    }));
    return Effect.succeed(data);
  }
}
