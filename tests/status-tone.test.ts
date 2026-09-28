import { describe, expect, it } from "vitest";
import { statusBadgeTone } from "../apps/web/src/app/shared/status-tone";

describe("status badge tone", () => {
  it("keeps the written status and only chooses a matching tone", () => {
    expect(statusBadgeTone("Ready")).toBe("success");
    expect(statusBadgeTone("Partial")).toBe("caution");
    expect(statusBadgeTone("Not enough evidence")).toBe("unavailable");
    expect(statusBadgeTone("Unavailable")).toBe("unavailable");
  });
});
