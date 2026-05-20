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

	it("uses grouped service rows before stale parent totals", () => {
		expect(
			getWorkflowLineDisplayTotal({
				uid: "service-line",
				lineTotal: 0,
				meta: {
					serviceRows: [
						{ uid: "svc-1", service: "Install", qty: 2, unitPrice: 30 },
						{ uid: "svc-2", service: "Cleanup", qty: 1, unitPrice: 10 },
					],
				},
			}),
		).toBe(70);
	});

	it("includes shared non-moulding component price in grouped moulding totals", () => {
		expect(
			getWorkflowLineDisplayTotal({
				uid: "moulding-line",
				formSteps: [
					{ step: { title: "Item Type" }, price: 5 },
					{ step: { title: "Moulding" } },
				],
				meta: {
					mouldingRows: [
						{ uid: "m1", qty: 2, salesPrice: 20, addon: 3 },
						{ uid: "m2", qty: 1, salesPrice: 10, customPrice: 40, addon: 2 },
					],
				},
			}),
		).toBe(98);
	});
});
