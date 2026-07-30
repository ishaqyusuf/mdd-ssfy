import {
	type ContractorAccountingEntryType,
	type ContractorMoneyInput,
	moneyToCents,
} from "./report";

export const CONTRACTOR_LEDGER_SOURCE_TYPES = [
	"JOB",
	"PAYMENT",
	"PAYMENT_ADJUSTMENT",
	"MANUAL_ADJUSTMENT",
	"OPENING_BALANCE",
	"MIGRATION",
] as const;

export type ContractorLedgerSourceType =
	(typeof CONTRACTOR_LEDGER_SOURCE_TYPES)[number];

export type ContractorLedgerEntryInput = {
	id: string;
	contractorId: number;
	type: ContractorAccountingEntryType;
	amount: ContractorMoneyInput;
	effectiveAt: Date | string;
	sourceType: ContractorLedgerSourceType;
	sourceId: string;
	liabilityDelta?: ContractorMoneyInput;
	reversalOfId?: string | null;
};

export type ContractorLedgerEntryProjection = ContractorLedgerEntryInput & {
	amountCents: number;
	liabilityDeltaCents: number;
	balanceAfterCents: number;
};

export function createContractorLedgerSourceKey(
	sourceType: ContractorLedgerSourceType,
	sourceId: string | number,
	suffix?: string | number | null,
) {
	const normalizedSourceId = String(sourceId).trim();
	if (!normalizedSourceId) throw new Error("Ledger source ID is required");
	return [sourceType, normalizedSourceId, suffix].filter(Boolean).join(":");
}

export function getContractorLiabilityDeltaCents(
	type: ContractorAccountingEntryType,
	amount: ContractorMoneyInput,
) {
	const cents = moneyToCents(amount);
	if (cents < 0) {
		throw new Error("Ledger entry amounts must be non-negative");
	}
	switch (type) {
		case "DEDUCTION":
		case "PAYOUT":
			return -cents;
		default:
			return cents;
	}
}

export function getContractorReversalDeltaCents(
	originalLiabilityDelta: ContractorMoneyInput,
) {
	return -moneyToCents(originalLiabilityDelta);
}

function toInstant(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error("Ledger effective date must be valid");
	}
	return date;
}

export function projectContractorLedger(
	entries: ContractorLedgerEntryInput[],
	openingBalanceCents = 0,
): ContractorLedgerEntryProjection[] {
	const ordered = [...entries].sort((left, right) => {
		const dateDifference =
			toInstant(left.effectiveAt).getTime() -
			toInstant(right.effectiveAt).getTime();
		return dateDifference || left.id.localeCompare(right.id);
	});
	let balanceAfterCents = openingBalanceCents;
	return ordered.map((entry) => {
		const amountCents = moneyToCents(entry.amount);
		const liabilityDeltaCents =
			entry.liabilityDelta === undefined
				? getContractorLiabilityDeltaCents(entry.type, entry.amount)
				: moneyToCents(entry.liabilityDelta);
		balanceAfterCents += liabilityDeltaCents;
		return {
			...entry,
			amountCents,
			liabilityDeltaCents,
			balanceAfterCents,
		};
	});
}
