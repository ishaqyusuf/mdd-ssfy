import { describe, expect, it } from "bun:test";
import type { ContractorPeriodReport } from "@gnd/contractor-accounting";
import { ContractorAccountingPdfDocument } from "./document";

function collectText(node: unknown, output: string[] = []) {
	if (node === null || node === undefined || typeof node === "boolean") {
		return output;
	}
	if (typeof node === "string" || typeof node === "number") {
		output.push(String(node));
		return output;
	}
	if (Array.isArray(node)) {
		for (const child of node) collectText(child, output);
		return output;
	}
	if (typeof node === "object" && "props" in node) {
		const element = node as {
			type?: unknown;
			props?: { children?: unknown };
		};
		if (typeof element.type === "function") {
			collectText(element.type(element.props || {}), output);
			return output;
		}
		collectText(element.props?.children, output);
	}
	return output;
}

describe("ContractorAccountingPdfDocument", () => {
	it("uses the canonical report totals and transactions", () => {
		const report: ContractorPeriodReport = {
			period: {
				from: "2026-01-01T05:00:00.000Z",
				toExclusive: "2026-09-01T04:00:00.000Z",
				timezone: "America/New_York",
			},
			summary: {
				openingBalanceCents: 5000,
				earnedCents: 10025,
				bonusCents: 0,
				expenseCents: 0,
				deductionCents: 1010,
				payoutCents: 9015,
				reversalCents: 0,
				netActivityCents: 0,
				closingBalanceCents: 5000,
				jobCount: 1,
				payoutCount: 1,
				contractorCount: 1,
			},
			contractors: [
				{
					contractorId: 77,
					contractorName: "G&C Interior",
					openingBalanceCents: 5000,
					earnedCents: 10025,
					bonusCents: 0,
					expenseCents: 0,
					deductionCents: 1010,
					payoutCents: 9015,
					reversalCents: 0,
					netActivityCents: 0,
					closingBalanceCents: 5000,
					jobCount: 1,
					payoutCount: 1,
				},
			],
			entries: [
				{
					id: "job:101",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "JOB_EARNED",
					amountCents: 10025,
					signedAmountCents: 10025,
					effectiveAt: "2026-01-05T15:00:00.000Z",
					description: "Install doors",
					jobId: 101,
				},
			],
		};

		const text = collectText(ContractorAccountingPdfDocument({ report }))
			.join(" ")
			.replace(/\s+/g, " ");

		expect(text).toContain("Contractor Accounting Report");
		expect(text).toContain("Jan 1, 2026");
		expect(text).toContain("Aug 31, 2026");
		expect(text).toContain("$100.25");
		expect(text).toContain("$50.00");
		expect(text).toContain("G&C Interior");
		expect(text).toContain("Install doors");
	});
});
