export type ContractorCloseReadinessInput = {
	hasCompletedReconciliation: boolean;
	reconciliationMatches: boolean;
	openIssueCount: number;
	staleResolutionCount: number;
	legacyDateFallbackCount: number;
	missingContractorNameCount: number;
	missingPayoutDateCount: number;
	reconciliationDifferenceCents: number;
};

export type ContractorCloseReadinessCheck = {
	code: string;
	label: string;
	status: "pass" | "warning" | "blocker";
	message: string;
};

export function buildContractorCloseReadiness(
	input: ContractorCloseReadinessInput,
) {
	const checks: ContractorCloseReadinessCheck[] = [
		{
			code: "RECONCILIATION_COMPLETE",
			label: "Reconciliation run",
			status: input.hasCompletedReconciliation ? "pass" : "blocker",
			message: input.hasCompletedReconciliation
				? "A completed reconciliation exists for this period."
				: "Run reconciliation for the selected period before closing.",
		},
		{
			code: "RECONCILIATION_MATCH",
			label: "Ledger cross-foot",
			status:
				input.reconciliationMatches && input.reconciliationDifferenceCents === 0
					? "pass"
					: "blocker",
			message:
				input.reconciliationMatches && input.reconciliationDifferenceCents === 0
					? "Ledger and source totals match."
					: "Ledger and source totals do not match.",
		},
		{
			code: "OPEN_ISSUES",
			label: "Open exceptions",
			status: input.openIssueCount === 0 ? "pass" : "blocker",
			message:
				input.openIssueCount === 0
					? "No open reconciliation exceptions."
					: `${input.openIssueCount} reconciliation exception(s) remain open.`,
		},
		{
			code: "STALE_RESOLUTIONS",
			label: "Resolution evidence",
			status: input.staleResolutionCount === 0 ? "pass" : "blocker",
			message:
				input.staleResolutionCount === 0
					? "All recorded resolutions match current evidence."
					: `${input.staleResolutionCount} resolution(s) are stale.`,
		},
		{
			code: "LEGACY_DATES",
			label: "Legacy date fallbacks",
			status: input.legacyDateFallbackCount === 0 ? "pass" : "warning",
			message:
				input.legacyDateFallbackCount === 0
					? "All job earnings use authoritative effective dates."
					: `${input.legacyDateFallbackCount} posting(s) use legacy date fallbacks.`,
		},
		{
			code: "IDENTITY",
			label: "Contractor identity",
			status: input.missingContractorNameCount === 0 ? "pass" : "warning",
			message:
				input.missingContractorNameCount === 0
					? "Every contractor has a display name."
					: `${input.missingContractorNameCount} contractor name(s) are missing.`,
		},
		{
			code: "PAYOUT_DATES",
			label: "Payout dates",
			status: input.missingPayoutDateCount === 0 ? "pass" : "blocker",
			message:
				input.missingPayoutDateCount === 0
					? "Every payout has an effective date."
					: `${input.missingPayoutDateCount} payout date(s) are missing.`,
		},
	];
	const blockerCount = checks.filter(
		(check) => check.status === "blocker",
	).length;
	return {
		ready: blockerCount === 0,
		blockerCount,
		warningCount: checks.filter((check) => check.status === "warning").length,
		checks,
	};
}
