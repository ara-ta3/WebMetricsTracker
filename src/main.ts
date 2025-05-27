import { Effect, pipe } from "effect";
import { GA4PVCollector } from "./application/GA4PVCollector.js";
import { container, TYPES } from "./config/Container.js";

async function main(): Promise<void> {
  const propertyIds = process.env.GA_PROPERTIES?.split(",") || [];
  const collector = container.get<GA4PVCollector>(TYPES.GA4PVCollector);
  await pipe(collector.collectAndNotifyPV(propertyIds), Effect.runPromise);
}

main();
