import { Effect, pipe } from "effect";
import type { SlackCommand } from "./command/SlackCommand.js";
import type { PVQuery } from "./query/PVQuery.js";
import { from } from "../domain/SlackMessage.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/Container.js";

@injectable()
export class GA4PVCollector {
  constructor(
    @inject(TYPES.PVQuery)
    public readonly pvQuery: PVQuery,

    @inject(TYPES.SlackCommand)
    public readonly slackCommand: SlackCommand
  ) {}

  public collectAndNotifyPV(properties: string[]): Effect.Effect<void, Error> {
    return pipe(
      this.pvQuery.getPV(properties),
      Effect.map((pvs) => from(pvs)),
      Effect.flatMap((message) => {
        return this.slackCommand.postMessage(message);
      })
    );
  }
}
