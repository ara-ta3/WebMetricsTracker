import { Config, Effect, pipe } from "effect";
import { GA4PVCollector } from "./application/GA4PVCollector.js";
import { TYPES } from "./config/Types.js";
import { container } from "./config/Container.js";

function propeties(): Config.Config<string[]> {
  return pipe(
    Config.string("GA_PROPERTIES"),
    Config.map((v) => v.split(",").map((s) => s.trim()))
  );
}

async function main(): Promise<void> {
  const collector = container.get<GA4PVCollector>(TYPES.GA4PVCollector);
  await pipe(
    propeties(),
    Effect.flatMap((propertyIds) => collector.collectAndNotifyPV(propertyIds)),
    Effect.runPromise
  );
}

main();
