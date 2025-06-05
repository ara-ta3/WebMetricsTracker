import type { Effect } from "effect";

export interface ErrorNotifier {
  notify(err: unknown): Effect.Effect<void, Error>;
}
