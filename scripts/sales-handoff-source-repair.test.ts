import { describe, expect, test } from "bun:test";
import {
	assertLocalSalesHandoffRepairDatabase,
	parseSalesHandoffSourceRepairArgs,
	renderSalesHandoffSourceRepairMarkdown,
} from "./sales-handoff-source-repair";

describe("sales-handoff:source-repair CLI", () => {
	test("defaults to bounded read-only Markdown output", () => {
		expect(parseSalesHandoffSourceRepairArgs([])).toMatchObject({
			apply: false,
			json: false,
			limit: 50,
			category: "ALL",
		});
	});

	test("parses cursor, category, and explicit ids", () => {
		expect(
			parseSalesHandoffSourceRepairArgs([
				"--json",
				"--category=payment",
				"--cursor",
				"repair-91",
				"--limit=100",
				"--sales-order-ids=91,92,91",
			]),
		).toMatchObject({
			json: true,
			category: "PAYMENT",
			cursor: "repair-91",
			limit: 100,
			salesOrderIds: [91, 92],
		});
	});

	test("requires confirmation for mutations and rejects non-local databases", () => {
		expect(() => parseSalesHandoffSourceRepairArgs(["--apply"])).toThrow(
			"--confirm-review",
		);
		expect(() =>
			assertLocalSalesHandoffRepairDatabase(
				"mysql://user:secret@example.com:3306/gnd",
			),
		).toThrow("local database");
	});

	test("renders the complete result list in Markdown", () => {
		const markdown = renderSalesHandoffSourceRepairMarkdown({
			mode: "dry-run",
			scanned: 1,
			planned: 1,
			repaired: 0,
			quarantined: 0,
			unresolved: 0,
			failed: 0,
			haltReason: null,
			nextCursor: null,
			mappingReview: [],
			results: [
				{
					markerId: "repair-91",
					salesOrderId: 91,
					category: "PAYMENT",
					status: "PLANNED",
					reason: "missing projection",
					lifecycleReviewRequired: false,
				},
			],
		});
		expect(markdown).toContain("| 91 | PAYMENT | PLANNED |");
	});
});
