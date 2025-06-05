import type { Effect } from "effect";

export interface ErrorReporter {
  notify(err: unknown): Effect.Effect<void, Error>;
}
