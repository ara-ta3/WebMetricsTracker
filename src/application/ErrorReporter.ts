import type { Effect } from "effect";

export interface ErrorReporter {
  report(err: unknown): Effect.Effect<void, Error>;
}
