import { describe, expect, it } from "bun:test";
import { __controlFlagTestUtils } from "./feature-flags";

describe("control feature flags", () => {
  it("parses truthy values", () => {
    expect(__controlFlagTestUtils.toBooleanFlag("1", false)).toBe(true);
    expect(__controlFlagTestUtils.toBooleanFlag("true", false)).toBe(true);
    expect(__controlFlagTestUtils.toBooleanFlag("on", false)).toBe(true);
  });

  it("parses falsy values", () => {
    expect(__controlFlagTestUtils.toBooleanFlag("0", true)).toBe(false);
    expect(__controlFlagTestUtils.toBooleanFlag("false", true)).toBe(false);
    expect(__controlFlagTestUtils.toBooleanFlag("off", true)).toBe(false);
  });

  it("falls back to default for unknown values", () => {
    expect(__controlFlagTestUtils.toBooleanFlag("maybe", true)).toBe(true);
    expect(__controlFlagTestUtils.toBooleanFlag("maybe", false)).toBe(false);
    expect(__controlFlagTestUtils.toBooleanFlag(undefined, true)).toBe(true);
    expect(__controlFlagTestUtils.toBooleanFlag(undefined, false)).toBe(false);
  });

  it("defaults overview read flag to control_read_v2 value", () => {
    expect(
      __controlFlagTestUtils.resolveControlOverviewReadV2Flag(undefined, true),
    ).toBe(true);
    expect(
      __controlFlagTestUtils.resolveControlOverviewReadV2Flag(undefined, false),
    ).toBe(false);
  });

  it("allows explicit overview flag override", () => {
    expect(
      __controlFlagTestUtils.resolveControlOverviewReadV2Flag("0", true),
    ).toBe(false);
    expect(
      __controlFlagTestUtils.resolveControlOverviewReadV2Flag("1", false),
    ).toBe(true);
  });
});
