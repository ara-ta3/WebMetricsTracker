import { Container } from "inversify";
import "reflect-metadata";
import type { PVQuery } from "../application/query/PVQuery.js";
import { Ga4PVQueryAdapter } from "../infrastructure/query/GA4PVQueryAdapter.js";
import type { SlackCommand } from "../application/command/SlackCommand.js";
import { SlackCommandAdapter } from "../infrastructure/command/SlackCommandAdapter.js";
import { envConfig } from "./EnvConfig.js";
import { TYPES } from "./Types.js";
import { GA4PVCollector } from "../application/GA4PVCollector.js";

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

container
  .bind<GA4PVCollector>(TYPES.GA4PVCollector)
  .to(GA4PVCollector)
  .inSingletonScope();

export { container };
