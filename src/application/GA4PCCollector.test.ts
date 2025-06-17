import { describe, it, expect } from "vitest";
import { Effect, pipe } from "effect";

import { GA4PVCollector } from "./GA4PVCollector.js";
import { MockPVQuery } from "./query/PVQuery.mock.js";
import { MockSlackCommand } from "./command/SlackCommand.mock.js";
import type { WebsiteConfig } from "../domain/WebsiteConfig.js";

describe("GA4PVCollector", () => {
  it("collectAndNotify", async () => {
    const mockPv = new MockPVQuery(42);
    const mockSlack = new MockSlackCommand();
    const collector = new GA4PVCollector(mockPv, mockSlack);

    const testWebsites: WebsiteConfig[] = [
      {
        name: "Test Site A",
        metrics: {
          ga4: { propertyId: "A" }
        }
      },
      {
        name: "Test Site B", 
        metrics: {
          ga4: { propertyId: "B" }
        }
      },
      {
        name: "Test Site C",
        metrics: {
          ga4: { propertyId: "C" }
        }
      }
    ];

    await pipe(
      collector.collectAndNotifyPV(testWebsites),
      Effect.runPromise,
    );

    expect(mockSlack.messages.length).toBe(1);
  });
});
