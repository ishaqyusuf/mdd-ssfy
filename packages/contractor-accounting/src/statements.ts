import Decimal from "decimal.js-light";
import { getContractorLiabilityDeltaCents } from "./ledger";
import type {
	ContractorAccountingEntry,
	ContractorPeriodBreakdown,
	ContractorPeriodReport,
	ContractorPeriodReportEntry,
} from "./report";
import { moneyToCents } from "./report";

export type ContractorAgingBuckets = {
	currentCents: number;
	days1To30Cents: number;
	days31To60Cents: number;
	days61To90Cents: number;
	over90DaysCents: number;
	totalCents: number;
};

type AgingLot = {
	effectiveAt: Date;
	remainingCents: number;
};

function daysBetween(from: Date, to: Date) {
	return Math.max(
		0,
		Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
	);
}

export function buildContractorAging(
	entries: Array<ContractorAccountingEntry | ContractorPeriodReportEntry>,
	asOf: Date | string,
): ContractorAgingBuckets {
	const asOfDate = asOf instanceof Date ? asOf : new Date(asOf);
	if (Number.isNaN(asOfDate.getTime()))
		throw new Error("Aging date must be valid");
	const lots: AgingLot[] = [];

	for (const entry of [...entries].sort(
		(left, right) =>
			new Date(left.effectiveAt).getTime() -
				new Date(right.effectiveAt).getTime() ||
			left.id.localeCompare(right.id),
	)) {
		const effectiveAt = new Date(entry.effectiveAt);
		if (effectiveAt > asOfDate) continue;
		const delta =
			"signedAmountCents" in entry
				? entry.signedAmountCents
				: entry.liabilityDelta === undefined
					? getContractorLiabilityDeltaCents(entry.type, entry.amount)
					: moneyToCents(entry.liabilityDelta);
		if (delta > 0) {
			lots.push({ effectiveAt, remainingCents: delta });
			continue;
		}
		let remainingReduction = Math.abs(delta);
		for (const lot of lots) {
			if (remainingReduction <= 0) break;
			const applied = Math.min(lot.remainingCents, remainingReduction);
			lot.remainingCents -= applied;
			remainingReduction -= applied;
		}
	}

	const result: ContractorAgingBuckets = {
		currentCents: 0,
		days1To30Cents: 0,
		days31To60Cents: 0,
		days61To90Cents: 0,
		over90DaysCents: 0,
		totalCents: 0,
	};
	for (const lot of lots) {
		if (!lot.remainingCents) continue;
		const age = daysBetween(lot.effectiveAt, asOfDate);
		if (age === 0) result.currentCents += lot.remainingCents;
		else if (age <= 30) result.days1To30Cents += lot.remainingCents;
		else if (age <= 60) result.days31To60Cents += lot.remainingCents;
		else if (age <= 90) result.days61To90Cents += lot.remainingCents;
		else result.over90DaysCents += lot.remainingCents;
		result.totalCents += lot.remainingCents;
	}
	return result;
}

export function getContractorStatement(
	report: ContractorPeriodReport,
	contractorId: number,
): {
	contractor: ContractorPeriodBreakdown;
	entries: ContractorPeriodReport["entries"];
} {
	const contractor = report.contractors.find(
		(item) => item.contractorId === contractorId,
	);
	if (!contractor) throw new Error("Contractor is not present in this report");
	return {
		contractor,
		entries: report.entries.filter(
			(entry) => entry.contractorId === contractorId,
		),
	};
}

export function centsToDecimalString(cents: number) {
	return new Decimal(cents).dividedBy(100).toFixed(2);
}
