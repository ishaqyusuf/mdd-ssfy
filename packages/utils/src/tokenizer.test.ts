import { describe, expect, it } from "bun:test";
import { CONTRACTOR_ACCOUNTING_PDF_AUDIENCE, tokenSchemas } from "./tokenizer";

describe("contractor accounting PDF token", () => {
	it("requires the finance-specific audience", () => {
		const payload = {
			from: "2026-01-01",
			to: "2026-08-31",
			timezone: "America/New_York",
			expiry: "2026-09-07T00:00:00.000Z",
		};

		expect(
			tokenSchemas.contractorAccountingPdfToken.safeParse(payload).success,
		).toBe(false);
		expect(
			tokenSchemas.contractorAccountingPdfToken.safeParse({
				...payload,
				audience: CONTRACTOR_ACCOUNTING_PDF_AUDIENCE,
			}).success,
		).toBe(true);
	});
});
