import { describe, expect, test } from "bun:test";

import { qtyMatrixRemainingAfterCoverage } from "./sales-control";

describe("qtyMatrixRemainingAfterCoverage", () => {
  test("does not double-count quantities that are both available and listed", () => {
    expect(
      qtyMatrixRemainingAfterCoverage(
        { qty: 19, lh: 5, rh: 14 },
        { qty: 13, lh: 0, rh: 13 },
        { qty: 13, lh: 0, rh: 13 },
      ),
    ).toMatchObject({ qty: 6, lh: 5, rh: 1 });
  });

  test("returns zero rather than a negative remainder once fully covered", () => {
    expect(
      qtyMatrixRemainingAfterCoverage(
        { qty: 19, lh: 5, rh: 14 },
        { qty: 19, lh: 5, rh: 14 },
        { qty: 20, lh: 6, rh: 14 },
      ),
    ).toMatchObject({ qty: 0, lh: 0, rh: 0 });
  });
});
