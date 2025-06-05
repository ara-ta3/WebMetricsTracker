import { Effect } from "effect";
import type { ErrorNotifier } from "./ErrorNotifier.js";

export class MockErrorNotifier implements ErrorNotifier {
  public readonly errors: unknown[] = [];

  notify(err: unknown): Effect.Effect<void, Error> {
    return Effect.sync(() => {
      this.errors.push(err);
    });
  }
}
