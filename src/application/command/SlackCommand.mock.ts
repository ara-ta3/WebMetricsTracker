import { Effect } from "effect";
import type { SlackCommand } from "../command/SlackCommand.js";

export class MockSlackCommand implements SlackCommand {
  public readonly messages: string[] = [];

  postMessage(message: string): Effect.Effect<void, Error> {
    return Effect.sync(() => {
      this.messages.push(message);
    });
  }
}
