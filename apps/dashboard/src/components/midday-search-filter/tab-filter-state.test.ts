import { describe, expect, it } from "bun:test";
import {
	getClearableFilterUpdate,
	hasActiveSearchValue,
} from "./tab-filter-state";

describe("selected page-tab filter state", () => {
	it("clears only ad-hoc filters and editable search values", () => {
		expect(
			getClearableFilterUpdate({
				filters: {
					paymentReview: "needs_review",
					priority: "high",
					q: "oak",
				},
				lockedKeys: new Set(["paymentReview"]),
				searchKey: "q",
			}),
		).toEqual({ priority: null, q: null });
	});

	it("detects prompt text before the debounced URL state changes", () => {
		expect(hasActiveSearchValue("oak", null)).toBe(true);
		expect(hasActiveSearchValue("", "oak")).toBe(true);
		expect(hasActiveSearchValue("", null)).toBe(false);
	});
});
