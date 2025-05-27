import { Effect } from "effect";
import type { SlackCommand } from "../command/SlackCommand.js";
import { SlackMessage } from "../../domain/SlackMessage.js";

export class MockSlackCommand implements SlackCommand {
  public readonly messages: SlackMessage[] = [];

  postMessage(message: SlackMessage): Effect.Effect<void, Error> {
    return Effect.sync(() => {
      this.messages.push(message);
    });
  }
}
