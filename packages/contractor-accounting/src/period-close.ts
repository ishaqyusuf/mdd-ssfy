export type ContractorAccountingPeriodState = {
	id?: string;
	from: Date | string;
	toExclusive: Date | string;
	status: "OPEN" | "CLOSED";
};

function instant(value: Date | string, field: string) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error(`${field} must be valid`);
	return date;
}

export function accountingPeriodsOverlap(
	left: Pick<ContractorAccountingPeriodState, "from" | "toExclusive">,
	right: Pick<ContractorAccountingPeriodState, "from" | "toExclusive">,
) {
	const leftFrom = instant(left.from, "Left period start");
	const leftTo = instant(left.toExclusive, "Left period end");
	const rightFrom = instant(right.from, "Right period start");
	const rightTo = instant(right.toExclusive, "Right period end");
	return leftFrom < rightTo && rightFrom < leftTo;
}

export function findClosedContractorAccountingPeriod(
	periods: ContractorAccountingPeriodState[],
	effectiveAt: Date | string,
) {
	const date = instant(effectiveAt, "Entry effective date");
	return (
		periods.find((period) => {
			if (period.status !== "CLOSED") return false;
			const from = instant(period.from, "Period start");
			const to = instant(period.toExclusive, "Period end");
			return date >= from && date < to;
		}) ?? null
	);
}

export function assertContractorAccountingDateIsWritable(
	periods: ContractorAccountingPeriodState[],
	effectiveAt: Date | string,
) {
	const period = findClosedContractorAccountingPeriod(periods, effectiveAt);
	if (period) {
		throw new Error(
			"Contractor accounting period is closed; reopen it before posting this entry.",
		);
	}
}
