import { getContractorLiabilityDeltaCents } from "./ledger";
import type { ContractorAccountingEntry } from "./report";
import { moneyToCents } from "./report";
import {
	type ContractorAgingBuckets,
	buildContractorAging,
} from "./statements";

export const CONTRACTOR_PAYABLE_READINESS = [
	"READY",
	"BLOCKED_RECONCILIATION",
	"BLOCKED_TAX",
	"NOT_PAYABLE",
] as const;

export type ContractorPayableReadiness =
	(typeof CONTRACTOR_PAYABLE_READINESS)[number];

export type ContractorPayableBlockers = {
	openIssueCount?: number;
	w9Status?: string | null;
};

export type ContractorPayable = {
	contractorId: number;
	contractorName: string;
	balanceCents: number;
	payableBalanceCents: number;
	aging: ContractorAgingBuckets;
	oldestUnpaidAt: string | null;
	lastPayoutAt: string | null;
	jobIds: number[];
	jobCount: number;
	payoutCount: number;
	openIssueCount: number;
	w9Status: string | null;
	readiness: ContractorPayableReadiness;
};

export type ContractorPayablesSummary = {
	contractorCount: number;
	readyCount: number;
	blockedCount: number;
	totalBalanceCents: number;
	totalPayableCents: number;
	over90DaysCents: number;
};

function orderedEntries(entries: ContractorAccountingEntry[]) {
	return [...entries].sort(
		(left, right) =>
			new Date(left.effectiveAt).getTime() -
				new Date(right.effectiveAt).getTime() ||
			left.id.localeCompare(right.id),
	);
}

function oldestOpenLotAt(
	entries: ContractorAccountingEntry[],
	asOf: Date,
): string | null {
	const lots: Array<{ effectiveAt: Date; remainingCents: number }> = [];
	for (const entry of orderedEntries(entries)) {
		const effectiveAt = new Date(entry.effectiveAt);
		if (effectiveAt > asOf) continue;
		const delta =
			entry.liabilityDelta == null
				? getContractorLiabilityDeltaCents(entry.type, entry.amount)
				: moneyToCents(entry.liabilityDelta);
		if (delta > 0) {
			lots.push({ effectiveAt, remainingCents: delta });
			continue;
		}
		let reduction = Math.abs(delta);
		for (const lot of lots) {
			if (reduction <= 0) break;
			const applied = Math.min(lot.remainingCents, reduction);
			lot.remainingCents -= applied;
			reduction -= applied;
		}
	}
	return (
		lots.find((lot) => lot.remainingCents > 0)?.effectiveAt.toISOString() ??
		null
	);
}

function getReadiness(
	balanceCents: number,
	blockers: ContractorPayableBlockers,
): ContractorPayableReadiness {
	if (balanceCents <= 0) return "NOT_PAYABLE";
	if ((blockers.openIssueCount ?? 0) > 0) return "BLOCKED_RECONCILIATION";
	if (
		!blockers.w9Status ||
		!["RECEIVED", "VERIFIED"].includes(blockers.w9Status)
	) {
		return "BLOCKED_TAX";
	}
	return "READY";
}

export function buildContractorPayables(input: {
	entries: ContractorAccountingEntry[];
	asOf: Date | string;
	blockersByContractor?: ReadonlyMap<number, ContractorPayableBlockers>;
}) {
	const asOf = input.asOf instanceof Date ? input.asOf : new Date(input.asOf);
	if (Number.isNaN(asOf.getTime()))
		throw new Error("Payables date must be valid");
	const byContractor = new Map<number, ContractorAccountingEntry[]>();
	for (const entry of input.entries) {
		if (new Date(entry.effectiveAt) > asOf) continue;
		const current = byContractor.get(entry.contractorId) ?? [];
		current.push(entry);
		byContractor.set(entry.contractorId, current);
	}

	const data = [...byContractor.entries()]
		.map(([contractorId, entries]): ContractorPayable => {
			const balanceCents = entries.reduce(
				(total, entry) =>
					total +
					(entry.liabilityDelta == null
						? getContractorLiabilityDeltaCents(entry.type, entry.amount)
						: moneyToCents(entry.liabilityDelta)),
				0,
			);
			const blockers = input.blockersByContractor?.get(contractorId) ?? {};
			const payoutEntries = entries.filter(
				(entry) => entry.type === "PAYOUT" || entry.type === "PAYOUT_REVERSAL",
			);
			const jobIds = [
				...new Set(
					entries.flatMap((entry) =>
						entry.type === "JOB_EARNED" && entry.jobId != null
							? [entry.jobId]
							: [],
					),
				),
			];
			const latestPayout = payoutEntries
				.map((entry) => new Date(entry.effectiveAt))
				.sort((left, right) => right.getTime() - left.getTime())[0];
			return {
				contractorId,
				contractorName:
					entries[0]?.contractorName ?? `Contractor #${contractorId}`,
				balanceCents,
				payableBalanceCents: Math.max(balanceCents, 0),
				aging: buildContractorAging(entries, asOf),
				oldestUnpaidAt: oldestOpenLotAt(entries, asOf),
				lastPayoutAt: latestPayout?.toISOString() ?? null,
				jobIds,
				jobCount: jobIds.length,
				payoutCount: new Set(
					payoutEntries.flatMap((entry) =>
						entry.paymentId == null ? [] : [entry.paymentId],
					),
				).size,
				openIssueCount: blockers.openIssueCount ?? 0,
				w9Status: blockers.w9Status ?? null,
				readiness: getReadiness(balanceCents, blockers),
			};
		})
		.sort(
			(left, right) =>
				right.payableBalanceCents - left.payableBalanceCents ||
				left.contractorName.localeCompare(right.contractorName),
		);

	const summary: ContractorPayablesSummary = {
		contractorCount: data.length,
		readyCount: data.filter((row) => row.readiness === "READY").length,
		blockedCount: data.filter((row) => row.readiness.startsWith("BLOCKED"))
			.length,
		totalBalanceCents: data.reduce((total, row) => total + row.balanceCents, 0),
		totalPayableCents: data.reduce(
			(total, row) => total + row.payableBalanceCents,
			0,
		),
		over90DaysCents: data.reduce(
			(total, row) => total + row.aging.over90DaysCents,
			0,
		),
	};
	return { data, summary };
}
