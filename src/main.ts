import { Effect, pipe } from "effect";
import { WebMetricsCollector } from "./application/WebMetricsCollector.js";
import type { ErrorReporter } from "./application/ErrorReporter.js";
import { TYPES } from "./config/Types.js";
import { container } from "./config/Container.js";
import { loadWebsiteConfigs } from "./config/YamlConfigLoader.js";

export async function main(): Promise<void> {
  const collector = container.get<WebMetricsCollector>(TYPES.WebMetricsCollector);
  await pipe(
    loadWebsiteConfigs(),
    Effect.flatMap((websites) => collector.collectAndNotify(websites)),
    Effect.runPromise,
  );
}

main().catch(async (err) => {
  const notifier = container.get<ErrorReporter>(TYPES.ErrorReporter);
  await Effect.runPromise(notifier.report(err));
  console.error(err);
  process.exit(1);
});
