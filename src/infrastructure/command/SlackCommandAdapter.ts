import { Effect } from "effect";
import fetch from "node-fetch";
import type { SlackCommand } from "../../application/command/SlackCommand.js";

export class SlackCommandAdapter implements SlackCommand {
  constructor(private readonly webhookUrl: string) {}

  postMessage(message: string): Effect.Effect<void, Error> {
    return Effect.try({
      try: async () => {
        const res = await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
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
