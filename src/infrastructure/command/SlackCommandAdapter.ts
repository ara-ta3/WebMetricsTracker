import { Effect } from "effect";
import type { SlackCommand } from "../../application/command/SlackCommand.js";

export class SlackCommandAdapter implements SlackCommand {
  constructor() {}

  postMessage(message: string): Effect.Effect<void, Error> {
    return Effect.succeed(() => {
      console.log(message);
    });
  }
}
