import { Effect } from "effect";
import type { ErrorReporter } from "./ErrorReporter.js";

export class MockErrorReporter implements ErrorReporter {
  public readonly errors: unknown[] = [];

  report(err: unknown): Effect.Effect<void, Error> {
    return Effect.sync(() => {
      this.errors.push(err);
    });
  }
}
