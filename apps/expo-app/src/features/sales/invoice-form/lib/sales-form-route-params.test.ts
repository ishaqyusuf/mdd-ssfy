import { describe, expect, it } from "bun:test";
import {
  normalizeRouteParam,
  normalizeSalesFormTypeParam,
} from "./sales-form-route-params";

describe("sales form route params", () => {
  it("normalizes quote type params", () => {
    expect(normalizeSalesFormTypeParam("quote")).toBe("quote");
    expect(normalizeSalesFormTypeParam(["quote"])).toBe("quote");
  });

  it("defaults missing or unknown type params to order", () => {
    expect(normalizeSalesFormTypeParam()).toBe("order");
    expect(normalizeSalesFormTypeParam("invoice")).toBe("order");
    expect(normalizeSalesFormTypeParam(["order"])).toBe("order");
  });

  it("reads the first value from array route params", () => {
    expect(normalizeRouteParam(["1", "2"])).toBe("1");
  });
});
