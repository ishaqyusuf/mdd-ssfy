import { expect, test } from "bun:test";
import { synchronizationResultMessage } from "./synchronization-result-message";

test("remaining material quantities are reported even without pending submissions", () => {
	expect(synchronizationResultMessage({remainingReviewCount:0,remainingMaterialQty:4,remainingAllocationBlockCount:1})).toContain("still need attention");
});
test("missing historical counters do not claim all materials are covered", () => {
	expect(synchronizationResultMessage({remainingReviewCount:0})).toBe("Eligible material coverage and submitted work were synchronized.");
});
