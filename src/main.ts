import { Effect, pipe } from "effect";
import "dotenv/config";
import { Ga4PVQueryAdapter } from "./infrastructure/query/GA4PVQueryAdapter.js";
import { SlackCommandAdapter } from "./infrastructure/command/SlackCommandAdapter.js";
import { GA4PVCollector } from "./application/GA4PVCollector.js";

async function main(): Promise<void> {
  const keyFile = process.env.GA_KEYFILE;
  const propertyIds = process.env.GA_PROPERTIES?.split(",") || [];
  const webhookUrl = process.env.SLACK_WEBHOOK;
  const pvQuery = new Ga4PVQueryAdapter(keyFile!);
  const slack = new SlackCommandAdapter(webhookUrl!);
  const collector = new GA4PVCollector(pvQuery, slack);
  await pipe(collector.collectAndNotifyPV(propertyIds), Effect.runPromise);
}

main();
