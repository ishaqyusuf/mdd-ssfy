import { describe, expect, test } from "bun:test";
import {
	generateContractorAccountingReportSchema,
	getContractorPeriodReportSchema,
	getContractorStatementReportSchema,
} from "./contractor-accounting";

describe("contractor accounting report schema", () => {
	test("accepts an inclusive January through August period", () => {
		expect(
			getContractorPeriodReportSchema.parse({
				from: "2026-01-01",
				to: "2026-08-31",
			}),
		).toEqual({
			from: "2026-01-01",
			to: "2026-08-31",
			timezone: "America/New_York",
			includeEntries: false,
		});
	});

	test("rejects invalid dates, reverse periods, and invalid timezones", () => {
		expect(
			getContractorPeriodReportSchema.safeParse({
				from: "2026-02-30",
				to: "2026-08-31",
			}).success,
		).toBe(false);
		expect(
			getContractorPeriodReportSchema.safeParse({
				from: "2026-09-01",
				to: "2026-08-31",
			}).success,
		).toBe(false);
		expect(
			getContractorPeriodReportSchema.safeParse({
				from: "2026-01-01",
				to: "2026-08-31",
				timezone: "Not/A_Timezone",
			}).success,
		).toBe(false);
	});

	test("accepts a full filter snapshot and enforces report combinations", () => {
		expect(
			generateContractorAccountingReportSchema.parse({
				from: "2026-01-01",
				to: "2026-08-31",
				kind: "CONSOLIDATED",
				format: "XLSX",
				q: "payment 204",
				contractorIds: [14],
				entryTypes: ["PAYOUT"],
				sourceTypes: ["PAYMENT"],
				amountMin: 500,
				amountMax: 2500,
				exceptionsOnly: true,
			}),
		).toMatchObject({
			contractorIds: [14],
			entryTypes: ["PAYOUT"],
			sourceTypes: ["PAYMENT"],
		});
		expect(
			generateContractorAccountingReportSchema.safeParse({
				from: "2026-01-01",
				to: "2026-08-31",
				kind: "CONTRACTOR_STATEMENT",
				format: "PDF",
			}).success,
		).toBe(false);
		expect(
			generateContractorAccountingReportSchema.safeParse({
				from: "2026-01-01",
				to: "2026-08-31",
				kind: "AGING",
				format: "PDF",
			}).success,
		).toBe(false);
	});

	test("builds the self-service statement schema without router import errors", () => {
		expect(
			getContractorStatementReportSchema.parse({
				from: "2026-01-01",
				to: "2026-08-31",
				q: "payout",
			}),
		).toMatchObject({
			from: "2026-01-01",
			to: "2026-08-31",
			includeEntries: true,
			q: "payout",
		});
		expect(
			getContractorStatementReportSchema.safeParse({
				from: "2026-01-01",
				to: "2026-08-31",
				contractorIds: [14],
			}).success,
		).toBe(true);
	});
});
