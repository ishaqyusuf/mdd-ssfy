import type { ContractorPeriodReport } from "./report";

export const CONTRACTOR_RECONCILIATION_ISSUE_CODES = [
	"SUMMARY_MISMATCH",
	"CONTRACTOR_MISMATCH",
	"MISSING_SOURCE",
	"DUPLICATE_SOURCE",
	"LEGACY_DATE_FALLBACK",
	"MISSING_EFFECTIVE_DATE",
] as const;

export type ContractorReconciliationIssueCode =
	(typeof CONTRACTOR_RECONCILIATION_ISSUE_CODES)[number];

export type ContractorReconciliationDifference = {
	code: ContractorReconciliationIssueCode;
	contractorId?: number;
	expectedCents: number;
	actualCents: number;
	differenceCents: number;
};

export function reconcileContractorPeriodReports(
	expected: ContractorPeriodReport,
	actual: ContractorPeriodReport,
) {
	const differences: ContractorReconciliationDifference[] = [];
	const summaryDifference =
		actual.summary.closingBalanceCents - expected.summary.closingBalanceCents;
	if (summaryDifference !== 0) {
		differences.push({
			code: "SUMMARY_MISMATCH",
			expectedCents: expected.summary.closingBalanceCents,
			actualCents: actual.summary.closingBalanceCents,
			differenceCents: summaryDifference,
		});
	}

	const expectedByContractor = new Map(
		expected.contractors.map((contractor) => [
			contractor.contractorId,
			contractor,
		]),
	);
	const actualByContractor = new Map(
		actual.contractors.map((contractor) => [
			contractor.contractorId,
			contractor,
		]),
	);
	const contractorIds = new Set([
		...expectedByContractor.keys(),
		...actualByContractor.keys(),
	]);

	for (const contractorId of contractorIds) {
		const expectedCents =
			expectedByContractor.get(contractorId)?.closingBalanceCents ?? 0;
		const actualCents =
			actualByContractor.get(contractorId)?.closingBalanceCents ?? 0;
		const differenceCents = actualCents - expectedCents;
		if (differenceCents !== 0) {
			differences.push({
				code: "CONTRACTOR_MISMATCH",
				contractorId,
				expectedCents,
				actualCents,
				differenceCents,
			});
		}
	}

	return {
		matches: differences.length === 0,
		differences,
	};
}
