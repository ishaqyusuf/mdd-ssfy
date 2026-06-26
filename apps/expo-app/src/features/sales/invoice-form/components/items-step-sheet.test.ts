import { describe, expect, it } from "bun:test";
import type { InvoiceItemSection } from "./items-step-sections";
import {
	getInvoiceItemDeleteLineUids,
	getInvoiceItemEditableLineUid,
	getInvoiceItemEditTitleLabel,
	getInvoiceItemSheetIndexLabel,
	getInvoiceItemSheetSummary,
	getNextInvoiceItemActiveIndex,
} from "./items-step-sheet";

describe("items step sheet helpers", () => {
	it("formats compact breadcrumb labels and item summaries", () => {
		const lines = [
			{ uid: "line-1" },
			{ uid: "line-2" },
		] as InvoiceItemSection["lines"];

		expect(getInvoiceItemSheetIndexLabel(0)).toBe("Item 01");
		expect(
			getInvoiceItemSheetSummary({
				key: "one",
				title: "Door",
				lines,
				qty: 3,
				total: 120,
				hasWorkflow: true,
			} satisfies InvoiceItemSection),
		).toBe("Qty 3 • 2 lines • $120.00");
	});

	it("resolves edit labels and section line targets", () => {
		const lines = [
			{ uid: "line-1" },
			{ uid: "line-2" },
		] as InvoiceItemSection["lines"];
		const section = {
			key: "one",
			title: "Door",
			lines,
			qty: 1,
			total: 10,
			hasWorkflow: true,
		} satisfies InvoiceItemSection;

		expect(getInvoiceItemEditTitleLabel(0)).toBe("Edit Item 1 Title");
		expect(getInvoiceItemEditableLineUid(section)).toBe("line-1");
		expect(getInvoiceItemDeleteLineUids(section)).toEqual(["line-1", "line-2"]);
	});

	it("clamps active index after deleting an item section", () => {
		expect(
			getNextInvoiceItemActiveIndex({
				currentIndex: 2,
				removedIndex: 1,
				itemCount: 4,
			}),
		).toBe(1);
		expect(
			getNextInvoiceItemActiveIndex({
				currentIndex: 1,
				removedIndex: 1,
				itemCount: 2,
			}),
		).toBe(0);
		expect(
			getNextInvoiceItemActiveIndex({
				currentIndex: 0,
				removedIndex: 1,
				itemCount: 3,
			}),
		).toBe(0);
	});
});
