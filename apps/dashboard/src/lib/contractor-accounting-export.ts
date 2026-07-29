import {
	type ContractorPeriodReport,
	formatMoneyCents,
	getContractorAccountingEntryLabel,
} from "@gnd/contractor-accounting";

function moneyNumber(cents: number) {
	return Number(formatMoneyCents(cents));
}

function formatBusinessDate(value: string, timezone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.formatToParts(new Date(value))
		.filter((part) => part.type !== "literal");
	const values = Object.fromEntries(
		parts.map((part) => [part.type, part.value]),
	);
	return `${values.year}-${values.month}-${values.day}`;
}

export function buildContractorAccountingExport(
	report: ContractorPeriodReport,
	input: { from: string; to: string },
) {
	const summaryRows = [
		{
			Metric: "Opening balance",
			Amount: moneyNumber(report.summary.openingBalanceCents),
		},
		{ Metric: "Earned", Amount: moneyNumber(report.summary.earnedCents) },
		{ Metric: "Bonuses", Amount: moneyNumber(report.summary.bonusCents) },
		{ Metric: "Expenses", Amount: moneyNumber(report.summary.expenseCents) },
		{
			Metric: "Deductions",
			Amount: moneyNumber(report.summary.deductionCents),
		},
		{ Metric: "Paid", Amount: moneyNumber(report.summary.payoutCents) },
		{
			Metric: "Reversals",
			Amount: moneyNumber(report.summary.reversalCents),
		},
		{
			Metric: "Net activity",
			Amount: moneyNumber(report.summary.netActivityCents),
		},
		{
			Metric: "Closing balance",
			Amount: moneyNumber(report.summary.closingBalanceCents),
		},
	];
	const contractorRows = report.contractors.map((contractor) => ({
		Contractor: contractor.contractorName,
		"Opening balance": moneyNumber(contractor.openingBalanceCents),
		Earned: moneyNumber(contractor.earnedCents),
		Bonuses: moneyNumber(contractor.bonusCents),
		Expenses: moneyNumber(contractor.expenseCents),
		Deductions: moneyNumber(contractor.deductionCents),
		Paid: moneyNumber(contractor.payoutCents),
		Reversals: moneyNumber(contractor.reversalCents),
		"Net activity": moneyNumber(contractor.netActivityCents),
		"Closing balance": moneyNumber(contractor.closingBalanceCents),
		Jobs: contractor.jobCount,
		Payouts: contractor.payoutCount,
	}));
	const entryRows = report.entries.map((entry) => ({
		Date: formatBusinessDate(entry.effectiveAt, report.period.timezone),
		Contractor: entry.contractorName,
		Type: getContractorAccountingEntryLabel(entry.type),
		Description: entry.description || "",
		Amount: moneyNumber(entry.amountCents),
		Effect: moneyNumber(entry.signedAmountCents),
		Project: entry.projectTitle || "",
		"Job ID": entry.jobId || "",
		"Payout ID": entry.paymentId || "",
	}));

	return {
		filename: `contractor-accounting-${input.from}-to-${input.to}.xlsx`,
		summaryRows,
		contractorRows,
		entryRows,
	};
}
