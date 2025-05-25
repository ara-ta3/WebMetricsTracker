import { Effect } from "effect";

export interface SlackCommand {
  postMessage(message: string): Effect.Effect<void, Error>;
}
