// tests/basic.test.ts
import { describe, it, expect } from "vitest";

describe("sample", () => {
  it("1000引く7は", () => {
    expect(1000 - 7).toBe(993);
  });
});
