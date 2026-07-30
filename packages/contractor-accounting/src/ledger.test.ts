import { describe, expect, it } from "bun:test";

import {
	createContractorLedgerSourceKey,
	getContractorLiabilityDeltaCents,
	getContractorReversalDeltaCents,
	projectContractorLedger,
} from "./ledger";

describe("contractor ledger", () => {
	it("uses stable idempotency keys and cent-safe liability directions", () => {
		expect(createContractorLedgerSourceKey("JOB", 42)).toBe("JOB:42");
		expect(createContractorLedgerSourceKey("PAYMENT_ADJUSTMENT", 7, 2)).toBe(
			"PAYMENT_ADJUSTMENT:7:2",
		);
		expect(getContractorLiabilityDeltaCents("JOB_EARNED", "100.25")).toBe(
			10025,
		);
		expect(getContractorLiabilityDeltaCents("PAYOUT", "90.15")).toBe(-9015);
		expect(getContractorReversalDeltaCents("-90.15")).toBe(9015);
	});

	it("projects deterministic running balances", () => {
		const projected = projectContractorLedger([
			{
				id: "payment:1",
				contractorId: 1,
				type: "PAYOUT",
				amount: "30.00",
				effectiveAt: "2026-01-03T00:00:00.000Z",
				sourceType: "PAYMENT",
				sourceId: "1",
			},
			{
				id: "job:1",
				contractorId: 1,
				type: "JOB_EARNED",
				amount: "100.00",
				effectiveAt: "2026-01-02T00:00:00.000Z",
				sourceType: "JOB",
				sourceId: "1",
			},
		]);
		expect(projected.map((entry) => entry.balanceAfterCents)).toEqual([
			10000, 7000,
		]);
	});
});
