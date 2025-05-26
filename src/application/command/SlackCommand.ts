import { Effect } from "effect";
import type { SlackMessage } from "../../domain/SlackMessage.js";

export interface SlackCommand {
  postMessage(message: SlackMessage): Effect.Effect<void, Error>;
}
