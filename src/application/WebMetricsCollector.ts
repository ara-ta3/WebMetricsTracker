import { Effect, pipe } from "effect";
import type { SlackCommand } from "./command/SlackCommand.js";
import type { PVQuery } from "./query/PVQuery.js";
import { from } from "../domain/SlackMessage.js";
import type { WebsiteConfig } from "../domain/WebsiteConfig.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/Types.js";

@injectable()
export class WebMetricsCollector {
  constructor(
    @inject(TYPES.PVQuery)
    public readonly pvQuery: PVQuery,

    @inject(TYPES.SlackCommand)
    public readonly slackCommand: SlackCommand,
  ) {}

  public collectAndNotify(
    websites: WebsiteConfig[],
  ): Effect.Effect<void, Error> {
    return pipe(
      this.pvQuery.getPVByWebsites(websites),
      Effect.map((pvs) => from(pvs)),
      Effect.flatMap((message) => {
        return this.slackCommand.postMessage(message);
      }),
    );
  }
}
