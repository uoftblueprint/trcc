import { describe, expect, it } from "vitest";
import { isForbiddenOperationMessage } from "@/lib/client/forbiddenOperationToast";

describe("forbiddenOperationToast", () => {
  it("detects server unauthorized messages", () => {
    expect(
      isForbiddenOperationMessage("Unauthorized: admin access required")
    ).toBe(true);
    expect(isForbiddenOperationMessage("Something else")).toBe(false);
    expect(isForbiddenOperationMessage(undefined)).toBe(false);
  });
});
