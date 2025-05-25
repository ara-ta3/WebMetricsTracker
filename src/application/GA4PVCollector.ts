import { Effect, pipe } from "effect";
import type { SlackCommand } from "./command/SlackCommand.js";
import type { PVQuery } from "./query/PVQuery.js";

export class GA4PVCollector {
  constructor(
    public readonly pvQuery: PVQuery,
    public readonly slackCommand: SlackCommand
  ) {}

  public collectAndNotifyPV(properties: string[]): Effect.Effect<void, Error> {
    return pipe(
      this.pvQuery.getPV(properties),
      Effect.flatMap((pvs) => {
        const formated = pvs
          .map((pv) => {
            return `Property: ${pv.property}, Page views: ${pv.pv}, Active Users: ${pv.activeUsers}`;
          })
          .join("\n");
        return Effect.succeed(formated);
      }),
      Effect.flatMap((message) => {
        return this.slackCommand.postMessage(message);
      })
    );
  }
}
