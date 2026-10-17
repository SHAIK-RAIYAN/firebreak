import { describe, it, expect } from "vitest";
import { newId } from "../src/util/ids.js";

describe("newId", () => {
  it("produces prefixed ids with correct format", () => {
    const id = newId("ws");
    expect(id).toMatch(/^ws_[0-9a-z]{20}$/);
  });

  it("uses different prefixes", () => {
    const wsId = newId("ws");
    const svcId = newId("svc");
    expect(wsId.startsWith("ws_")).toBe(true);
    expect(svcId.startsWith("svc_")).toBe(true);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId("inc")));
    expect(ids.size).toBe(100);
  });
});
