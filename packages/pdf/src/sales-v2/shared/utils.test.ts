import { describe, expect, it } from "bun:test";
import { colWidthWithRemainder } from "./utils";

describe("sales PDF column widths", () => {
  it("assigns a legacy service layout's unclaimed width to its description", () => {
    expect(colWidthWithRemainder(4, 11.2)).toBe("64%");
  });

  it("preserves a description that already fills the 20-unit grid", () => {
    expect(colWidthWithRemainder(12.8, 20)).toBe("64%");
  });
});
