import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";

import { MockErrorReporter } from "./application/ErrorReporter.mock.js";

vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));
class FailingCollector {
  collectAndNotifyPV(): Effect.Effect<void, Error> {
    return Effect.fail(new Error("fail"));
  }
}

describe("main", () => {
  it("calls ErrorReporter on failure", async () => {
    process.env.GA_KEYFILE = "dummy";
    process.env.SLACK_WEBHOOK = "dummy";
    process.env.SENTRY_DSN = "dummy";
    const { container } = await import("./config/Container.js");
    const { TYPES } = await import("./config/Types.js");

    const mockNotifier = new MockErrorReporter();
    container.unbind(TYPES.GA4PVCollector);
    container
      .bind(TYPES.GA4PVCollector)
      .toConstantValue(new FailingCollector() as any);
    container.unbind(TYPES.ErrorReporter);
    container.bind(TYPES.ErrorReporter).toConstantValue(mockNotifier);
    process.env.GA_PROPERTIES = "A";
    const exitMock = vi.spyOn(process, "exit").mockImplementation(() => void 0);

    await import("./main.js");
    await Promise.resolve();

    expect(mockNotifier.errors.length).toBe(1);

    exitMock.mockRestore();
  });
});
