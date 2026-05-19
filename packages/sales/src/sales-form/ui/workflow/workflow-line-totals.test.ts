import { describe, expect, it } from "bun:test";
import { getWorkflowLineDisplayTotal } from "./workflow-line-totals";

describe("workflow line totals", () => {
	it("falls back to quantity times unit price", () => {
		expect(
			getWorkflowLineDisplayTotal({
				uid: "line-1",
				qty: 3,
				unitPrice: 12,
				lineTotal: 0,
			}),
		).toBe(36);
	});

	it("uses stored line total when present", () => {
		expect(
			getWorkflowLineDisplayTotal({
				uid: "line-1",
				qty: 3,
				unitPrice: 12,
				lineTotal: 40,
			}),
		).toBe(40);
	});
});

