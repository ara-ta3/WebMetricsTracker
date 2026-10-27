import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import fetch, { Response } from "node-fetch";
import { SlackCommandAdapter } from "./SlackCommandAdapter.js";

vi.mock("node-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node-fetch")>()),
  default: vi.fn(),
}));

const webhookUrl = "https://example.com/test-webhook";

describe("SlackCommandAdapter", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockImplementation(async () => new Response("ok"));
  });

  it("50ブロックは1回で送信する", async () => {
    const message = {
      blocks: Array.from({ length: 50 }, () => ({ type: "divider" })),
    };
    const adapter = new SlackCommandAdapter(webhookUrl);

    await Effect.runPromise(adapter.postMessage(message));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  });

  it("59ブロックを50件と9件に分け、順序と全データを保って送信する", async () => {
    const message = {
      blocks: Array.from({ length: 59 }, (_, index) => ({
        type: "section",
        text: { type: "mrkdwn" as const, text: `Block ${index}` },
      })),
    };
    const adapter = new SlackCommandAdapter(webhookUrl);

    await Effect.runPromise(adapter.postMessage(message));

    expect(message.blocks.length).toBe(59);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: message.blocks.slice(0, 50) }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: message.blocks.slice(50) }),
    });
  });

  it("送信が失敗したらEffectのエラーとして返し、残りの送信を中止する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("invalid_blocks", { status: 400 }),
    );
    const message = {
      blocks: Array.from({ length: 51 }, () => ({ type: "divider" })),
    };
    const adapter = new SlackCommandAdapter(webhookUrl);

    const result = await Effect.runPromise(
      Effect.flip(adapter.postMessage(message)),
    );

    expect(result).toEqual(new Error("Slack API error 400: invalid_blocks"));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
