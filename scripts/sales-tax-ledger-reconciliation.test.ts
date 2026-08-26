import { describe, expect, it } from "bun:test";

import { parseSalesTaxReconciliationArgs } from "./sales-tax-ledger-reconciliation";

describe("sales tax ledger reconciliation arguments", () => {
	it("is a bounded dry run by default", () => {
		expect(parseSalesTaxReconciliationArgs([])).toEqual({
			apply: false,
			confirmReview: false,
			salesOrderIds: null,
			afterId: null,
			limit: 500,
			from: null,
			to: null,
		});
	});

	it("requires reviewed explicit order ids before applying", () => {
		expect(() => parseSalesTaxReconciliationArgs(["--apply"])).toThrow(
			"requires --confirm-review and explicit --sales-order-ids",
		);
		expect(
			parseSalesTaxReconciliationArgs([
				"--apply",
				"--confirm-review",
				"--sales-order-ids=10,11",
			]),
		).toMatchObject({ apply: true, salesOrderIds: [10, 11] });
	});

	it("requires complete optional report-period bounds", () => {
		expect(() =>
			parseSalesTaxReconciliationArgs(["--from=2026-08-01"]),
		).toThrow("--from and --to must be provided together");
		expect(
			parseSalesTaxReconciliationArgs(["--from=2026-08-01", "--to=2026-08-26"]),
		).toMatchObject({ from: "2026-08-01", to: "2026-08-26" });
	});
});
