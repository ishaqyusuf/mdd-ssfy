import { getContractorLiabilityDeltaCents } from "./ledger";
import type { ContractorAccountingEntry } from "./report";
import { moneyToCents } from "./report";

export type ContractorAccountingTrendInterval = "day" | "week" | "month";

export type ContractorAccountingTrendPoint = {
	period: string;
	earnedCents: number;
	payoutCents: number;
	netActivityCents: number;
	closingBalanceCents: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function intervalFor(from: Date, toExclusive: Date) {
	const days = Math.ceil((toExclusive.getTime() - from.getTime()) / DAY_MS);
	if (days > 3653) {
		throw new Error("Accounting insights are limited to ten years");
	}
	if (days <= 45) return "day" as const;
	if (days <= 365) return "week" as const;
	return "month" as const;
}

function dateKey(value: Date, interval: ContractorAccountingTrendInterval) {
	if (interval === "day") return value.toISOString().slice(0, 10);
	if (interval === "month") return value.toISOString().slice(0, 7);
	const date = new Date(
		Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
	);
	const weekday = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() - weekday + 1);
	return date.toISOString().slice(0, 10);
}

function nextPeriod(value: Date, interval: ContractorAccountingTrendInterval) {
	const next = new Date(value);
	if (interval === "day") next.setUTCDate(next.getUTCDate() + 1);
	else if (interval === "week") next.setUTCDate(next.getUTCDate() + 7);
	else next.setUTCMonth(next.getUTCMonth() + 1);
	return next;
}

function entryDelta(entry: ContractorAccountingEntry) {
	return entry.liabilityDelta == null
		? getContractorLiabilityDeltaCents(entry.type, entry.amount)
		: moneyToCents(entry.liabilityDelta);
}

export function buildContractorAccountingTrend(input: {
	entries: ContractorAccountingEntry[];
	from: Date | string;
	toExclusive: Date | string;
}) {
	const from = new Date(input.from);
	const toExclusive = new Date(input.toExclusive);
	if (
		Number.isNaN(from.getTime()) ||
		Number.isNaN(toExclusive.getTime()) ||
		toExclusive <= from
	) {
		throw new Error("Accounting insight period must be valid");
	}
	const interval = intervalFor(from, toExclusive);
	const openingBalanceCents = input.entries
		.filter((entry) => new Date(entry.effectiveAt) < from)
		.reduce((total, entry) => total + entryDelta(entry), 0);
	const activity = input.entries.filter((entry) => {
		const date = new Date(entry.effectiveAt);
		return date >= from && date < toExclusive;
	});
	const byPeriod = new Map<
		string,
		Omit<ContractorAccountingTrendPoint, "period" | "closingBalanceCents">
	>();
	for (const entry of activity) {
		const key = dateKey(new Date(entry.effectiveAt), interval);
		const current = byPeriod.get(key) ?? {
			earnedCents: 0,
			payoutCents: 0,
			netActivityCents: 0,
		};
		const delta = entryDelta(entry);
		current.netActivityCents += delta;
		if (entry.type === "JOB_EARNED") {
			current.earnedCents += moneyToCents(entry.amount);
		}
		if (entry.type === "PAYOUT") {
			current.payoutCents += moneyToCents(entry.amount);
		}
		byPeriod.set(key, current);
	}

	const first =
		interval === "month"
			? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
			: interval === "week"
				? new Date(`${dateKey(from, interval)}T00:00:00.000Z`)
				: new Date(
						Date.UTC(
							from.getUTCFullYear(),
							from.getUTCMonth(),
							from.getUTCDate(),
						),
					);
	const points: ContractorAccountingTrendPoint[] = [];
	let closingBalanceCents = openingBalanceCents;
	for (
		let cursor = first;
		cursor < toExclusive;
		cursor = nextPeriod(cursor, interval)
	) {
		const period = dateKey(cursor, interval);
		const values = byPeriod.get(period) ?? {
			earnedCents: 0,
			payoutCents: 0,
			netActivityCents: 0,
		};
		closingBalanceCents += values.netActivityCents;
		points.push({ period, ...values, closingBalanceCents });
	}
	return { interval, openingBalanceCents, points };
}
