import { Effect } from "effect";
import { inject, injectable } from "inversify";
import * as Sentry from "@sentry/node";
import type { ErrorReporter } from "../../application/ErrorReporter.js";
import { TYPES } from "../../config/Types.js";

@injectable()
export class SentryErrorReporter implements ErrorReporter {
  constructor(@inject(TYPES.config.SentryDsn) dsn: string) {
    Sentry.init({ dsn });
  }

  report(err: unknown): Effect.Effect<void, Error> {
    return Effect.try({
      try: () => {
        Sentry.captureException(err);
      },
      catch: (e) => (e instanceof Error ? e : new Error(String(e))),
    });
  }
}
