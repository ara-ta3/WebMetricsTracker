import { describe, it, expect } from "vitest";
import { Effect, pipe } from "effect";

import { WebMetricsCollector } from "./WebMetricsCollector.js";
import { MockPVQuery } from "./query/PVQuery.mock.js";
import { MockSlackCommand } from "./command/SlackCommand.mock.js";
import type { WebsiteConfig } from "../domain/WebsiteConfig.js";

describe("WebMetricsCollector", () => {
  it("collectAndNotify", async () => {
    const mockPv = new MockPVQuery(42);
    const mockSlack = new MockSlackCommand();
    const collector = new WebMetricsCollector(mockPv, mockSlack);

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
      collector.collectAndNotify(testWebsites),
      Effect.runPromise,
    );

    expect(mockSlack.messages.length).toBe(1);
  });
});