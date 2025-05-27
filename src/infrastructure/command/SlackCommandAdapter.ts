import { Effect } from "effect";
import fetch from "node-fetch";
import type { SlackCommand } from "../../application/command/SlackCommand.js";
import type { SlackMessage } from "../../domain/SlackMessage.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../../config/Types.js";

@injectable()
export class SlackCommandAdapter implements SlackCommand {
  constructor(
    @inject(TYPES.config.SlackWebhookUrl) private readonly webhookUrl: string
  ) {}

  postMessage(message: SlackMessage): Effect.Effect<void, Error> {
    return Effect.try({
      try: async () => {
        const res = await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Slack API error ${res.status}: ${body}`);
        }
      },
      catch: (err) => (err instanceof Error ? err : new Error(String(err))),
    });
  }
}
