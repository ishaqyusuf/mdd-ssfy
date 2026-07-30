import Decimal from "decimal.js-light";

export const CONTRACTOR_ACCOUNTING_ENTRY_TYPES = [
	"OPENING_BALANCE",
	"JOB_EARNED",
	"BONUS",
	"EXPENSE",
	"DEDUCTION",
	"PAYOUT",
	"PAYOUT_REVERSAL",
	"REVERSAL",
] as const;

export type ContractorAccountingEntryType =
	(typeof CONTRACTOR_ACCOUNTING_ENTRY_TYPES)[number];

export type ContractorMoneyInput =
	| string
	| number
	| bigint
	| { toString(): string };

export type ContractorAccountingEntry = {
	id: string;
	contractorId: number;
	contractorName: string;
	type: ContractorAccountingEntryType;
	amount: ContractorMoneyInput;
	liabilityDelta?: ContractorMoneyInput;
	effectiveAt: Date | string;
	description?: string | null;
	jobId?: number | null;
	paymentId?: number | null;
	projectId?: number | null;
	projectTitle?: string | null;
};

export type ContractorAccountingPeriod = {
	from: Date | string;
	toExclusive: Date | string;
	timezone: string;
};

export type DateOnlyContractorAccountingPeriod = {
	from: string;
	to: string;
	timezone: string;
};

export type ContractorPeriodReportInput = {
	period: ContractorAccountingPeriod;
	entries: ContractorAccountingEntry[];
	contractorIds?: number[] | null;
};

export type ContractorPeriodReportEntry = Omit<
	ContractorAccountingEntry,
	"amount" | "liabilityDelta" | "effectiveAt"
> & {
	amountCents: number;
	signedAmountCents: number;
	effectiveAt: string;
};

export type ContractorPeriodTotals = {
	openingBalanceCents: number;
	earnedCents: number;
	bonusCents: number;
	expenseCents: number;
	deductionCents: number;
	payoutCents: number;
	reversalCents: number;
	netActivityCents: number;
	closingBalanceCents: number;
	jobCount: number;
	payoutCount: number;
};

export type ContractorPeriodBreakdown = ContractorPeriodTotals & {
	contractorId: number;
	contractorName: string;
};

export type ContractorPeriodReport = {
	period: {
		from: string;
		toExclusive: string;
		timezone: string;
	};
	summary: ContractorPeriodTotals & {
		contractorCount: number;
	};
	contractors: ContractorPeriodBreakdown[];
	entries: ContractorPeriodReportEntry[];
};

export function moneyToCents(value: ContractorMoneyInput): number {
	const decimal = new Decimal(
		typeof value === "object" || typeof value === "bigint"
			? value.toString()
			: value,
	);
	return decimal
		.times(100)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
}

export function formatMoneyCents(value: number): string {
	return new Decimal(value).dividedBy(100).toFixed(2);
}

export function formatDateOnlyInTimezone(
	value: Date | string,
	timezone: string,
): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error("Date must be valid");
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		})
			.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value]),
	);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getContractorAccountingEntryLabel(
	type: ContractorAccountingEntryType,
) {
	return {
		OPENING_BALANCE: "Opening balance",
		JOB_EARNED: "Job earned",
		BONUS: "Bonus",
		EXPENSE: "Expense",
		DEDUCTION: "Deduction",
		PAYOUT: "Payout",
		PAYOUT_REVERSAL: "Payout reversal",
		REVERSAL: "Reversal",
	}[type];
}

export function getContractorAdjustmentCents(
	totals: Pick<
		ContractorPeriodTotals,
		"bonusCents" | "expenseCents" | "deductionCents" | "reversalCents"
	>,
) {
	return (
		totals.bonusCents +
		totals.expenseCents -
		totals.deductionCents +
		totals.reversalCents
	);
}

function parseDateOnly(value: string, field: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error(`${field} must use YYYY-MM-DD`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		throw new Error(`${field} must be a valid calendar date`);
	}
	return { year, month, day };
}

function timezoneOffsetMs(date: Date, timezone: string) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	const parts = Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	) as Record<string, number | undefined>;
	const part = (name: string) => {
		const value = parts[name];
		if (value == null || Number.isNaN(value)) {
			throw new Error(`Unable to resolve ${name} in timezone ${timezone}`);
		}
		return value;
	};
	const representedAsUtc = Date.UTC(
		part("year"),
		part("month") - 1,
		part("day"),
		part("hour"),
		part("minute"),
		part("second"),
	);
	return representedAsUtc - date.getTime();
}

function zonedStartOfDayUtc(
	date: { year: number; month: number; day: number },
	timezone: string,
) {
	const nominalUtc = Date.UTC(date.year, date.month - 1, date.day);
	const firstOffset = timezoneOffsetMs(new Date(nominalUtc), timezone);
	let resolved = new Date(nominalUtc - firstOffset);
	const resolvedOffset = timezoneOffsetMs(resolved, timezone);
	if (resolvedOffset !== firstOffset) {
		resolved = new Date(nominalUtc - resolvedOffset);
	}
	return resolved;
}

export function createDateOnlyReportPeriod({
	from,
	to,
	timezone,
}: DateOnlyContractorAccountingPeriod) {
	const start = parseDateOnly(from, "Report period start");
	const inclusiveEnd = parseDateOnly(to, "Report period end");
	const nextDay = new Date(
		Date.UTC(inclusiveEnd.year, inclusiveEnd.month - 1, inclusiveEnd.day + 1),
	);
	const startUtc = zonedStartOfDayUtc(start, timezone);
	const endExclusiveUtc = zonedStartOfDayUtc(
		{
			year: nextDay.getUTCFullYear(),
			month: nextDay.getUTCMonth() + 1,
			day: nextDay.getUTCDate(),
		},
		timezone,
	);
	if (endExclusiveUtc.getTime() <= startUtc.getTime()) {
		throw new Error("Report period end must be on or after its start");
	}
	return {
		from: startUtc.toISOString(),
		toExclusive: endExclusiveUtc.toISOString(),
		timezone,
	};
}

function parseInstant(value: Date | string, field: string) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`${field} must be a valid date`);
	}
	return date;
}

function createTotals(): ContractorPeriodTotals {
	return {
		openingBalanceCents: 0,
		earnedCents: 0,
		bonusCents: 0,
		expenseCents: 0,
		deductionCents: 0,
		payoutCents: 0,
		reversalCents: 0,
		netActivityCents: 0,
		closingBalanceCents: 0,
		jobCount: 0,
		payoutCount: 0,
	};
}

function getSignedEffect(type: ContractorAccountingEntryType, cents: number) {
	switch (type) {
		case "OPENING_BALANCE":
		case "JOB_EARNED":
		case "BONUS":
		case "EXPENSE":
		case "PAYOUT_REVERSAL":
		case "REVERSAL":
			return cents;
		case "DEDUCTION":
		case "PAYOUT":
			return -cents;
	}
}

function applyPeriodEntry(
	totals: ContractorPeriodTotals,
	entry: ContractorPeriodReportEntry,
) {
	switch (entry.type) {
		case "JOB_EARNED":
			totals.earnedCents += entry.amountCents;
			break;
		case "BONUS":
			totals.bonusCents += entry.amountCents;
			break;
		case "EXPENSE":
			totals.expenseCents += entry.amountCents;
			break;
		case "DEDUCTION":
			totals.deductionCents += entry.amountCents;
			break;
		case "PAYOUT":
			totals.payoutCents += entry.amountCents;
			break;
		case "PAYOUT_REVERSAL":
			totals.reversalCents += entry.amountCents;
			break;
		case "REVERSAL":
			totals.reversalCents += entry.signedAmountCents;
			break;
		case "OPENING_BALANCE":
			break;
	}
	totals.netActivityCents += entry.signedAmountCents;
}

function finalizeCounts(
	totals: ContractorPeriodTotals,
	entries: ContractorPeriodReportEntry[],
) {
	totals.jobCount = new Set(
		entries.map((entry) => entry.jobId).filter((id) => id != null),
	).size;
	totals.payoutCount = new Set(
		entries.map((entry) => entry.paymentId).filter((id) => id != null),
	).size;
	totals.closingBalanceCents =
		totals.openingBalanceCents + totals.netActivityCents;
}

export function buildContractorPeriodReport({
	period,
	entries,
	contractorIds,
}: ContractorPeriodReportInput): ContractorPeriodReport {
	const from = parseInstant(period.from, "Report period start");
	const toExclusive = parseInstant(period.toExclusive, "Report period end");
	if (toExclusive.getTime() <= from.getTime()) {
		throw new Error("Report period end must be after its start");
	}

	const contractorFilter = contractorIds?.length
		? new Set(contractorIds)
		: null;
	const summary = createTotals();
	const reportEntries: ContractorPeriodReportEntry[] = [];
	const contractorTotals = new Map<number, ContractorPeriodBreakdown>();
	const contractorEntries = new Map<number, ContractorPeriodReportEntry[]>();

	const getContractor = (entry: ContractorAccountingEntry) => {
		const current = contractorTotals.get(entry.contractorId);
		if (current) return current;
		const created = {
			...createTotals(),
			contractorId: entry.contractorId,
			contractorName: entry.contractorName,
		};
		contractorTotals.set(entry.contractorId, created);
		return created;
	};

	for (const sourceEntry of entries) {
		if (contractorFilter && !contractorFilter.has(sourceEntry.contractorId)) {
			continue;
		}
		const effectiveAt = parseInstant(
			sourceEntry.effectiveAt,
			`Entry ${sourceEntry.id} effective date`,
		);
		if (effectiveAt.getTime() >= toExclusive.getTime()) continue;

		const amountCents = Math.abs(moneyToCents(sourceEntry.amount));
		const signedAmountCents =
			sourceEntry.liabilityDelta === undefined
				? getSignedEffect(sourceEntry.type, amountCents)
				: moneyToCents(sourceEntry.liabilityDelta);
		const normalizedEntry: ContractorPeriodReportEntry = {
			...sourceEntry,
			amountCents,
			signedAmountCents,
			effectiveAt: effectiveAt.toISOString(),
		};
		const contractor = getContractor(sourceEntry);

		if (effectiveAt.getTime() < from.getTime()) {
			summary.openingBalanceCents += signedAmountCents;
			contractor.openingBalanceCents += signedAmountCents;
			continue;
		}

		reportEntries.push(normalizedEntry);
		const contractorPeriodEntries =
			contractorEntries.get(sourceEntry.contractorId) ?? [];
		contractorPeriodEntries.push(normalizedEntry);
		contractorEntries.set(sourceEntry.contractorId, contractorPeriodEntries);
		applyPeriodEntry(summary, normalizedEntry);
		applyPeriodEntry(contractor, normalizedEntry);
	}

	reportEntries.sort(
		(left, right) =>
			left.effectiveAt.localeCompare(right.effectiveAt) ||
			left.id.localeCompare(right.id),
	);
	finalizeCounts(summary, reportEntries);

	const contractors = Array.from(contractorTotals.values())
		.map((contractor) => {
			finalizeCounts(
				contractor,
				contractorEntries.get(contractor.contractorId) ?? [],
			);
			return contractor;
		})
		.filter(
			(contractor) =>
				contractor.openingBalanceCents !== 0 ||
				contractor.netActivityCents !== 0 ||
				contractor.jobCount !== 0 ||
				contractor.payoutCount !== 0,
		)
		.sort((left, right) =>
			left.contractorName.localeCompare(right.contractorName),
		);

	return {
		period: {
			from: from.toISOString(),
			toExclusive: toExclusive.toISOString(),
			timezone: period.timezone,
		},
		summary: {
			...summary,
			contractorCount: contractors.length,
		},
		contractors,
		entries: reportEntries,
	};
}
