import { Container } from "inversify";
import "reflect-metadata";
import type { PVQuery } from "../application/query/PVQuery.js";
import { Ga4PVQueryAdapter } from "../infrastructure/query/GA4PVQueryAdapter.js";
import type { SlackCommand } from "../application/command/SlackCommand.js";
import { SlackCommandAdapter } from "../infrastructure/command/SlackCommandAdapter.js";
import { envConfig } from "./EnvConfig.js";

export const TYPES = {
  config: {
    GoogleKeyFilePath: Symbol.for("GoogleKeyFilePath"),
    SlackWebhookUrl: Symbol.for("SlackWebhookUrl"),
  },
  PVQuery: Symbol.for("PQuery"),
  SlackCommand: Symbol.for("SlackCommand"),
  GA4PVCollector: Symbol.for("GA4PVCollector"),
};

const container = new Container();

container
  .bind<string>(TYPES.config.GoogleKeyFilePath)
  .toConstantValue(envConfig.GoogleKeyFilePath);

container
  .bind<string>(TYPES.config.SlackWebhookUrl)
  .toConstantValue(envConfig.SlackWebhookUrl);

container.bind<PVQuery>(TYPES.PVQuery).to(Ga4PVQueryAdapter).inSingletonScope();

container
  .bind<SlackCommand>(TYPES.SlackCommand)
  .to(SlackCommandAdapter)
  .inSingletonScope();

export { container };
