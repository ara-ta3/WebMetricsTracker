import { describe, it, expect } from "vitest";
import { pipe } from "effect";
import { Effect } from "effect";

import { GA4PVCollector } from "./GA4PVCollector.js";
import { MockPVQuery } from "./query/PVQuery.mock.js";
import { MockSlackCommand } from "./command/SlackCommand.mock.js";

describe("GA4PVCollector", () => {
  it("collectAndNotify", async () => {
    const mockPv = new MockPVQuery(42);
    const mockSlack = new MockSlackCommand();
    const collector = new GA4PVCollector(mockPv, mockSlack);

    await pipe(
      collector.collectAndNotifyPV(["A", "B", "C"]),
      Effect.runPromise
    );

    expect(mockSlack.messages[0]).toBe(
      `Property: A, Page views: 42\nProperty: B, Page views: 42\nProperty: C, Page views: 42`
    );
  });
});
