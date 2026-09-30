import { Prisma } from "@prisma/client";
import {
	type PostContractorLedgerEntryInput,
	postContractorLedgerEntry,
	reverseContractorLedgerEntry,
} from "./contractor-accounting";

type LedgerDb = Parameters<typeof postContractorLedgerEntry>[0];
type JobEarningInput = Pick<
	PostContractorLedgerEntryInput,
	| "contractorId"
	| "amount"
	| "effectiveAt"
	| "description"
	| "createdById"
	| "meta"
> & { jobId: number };

/** Ensure payable work is earned once, retaining its immutable accounting date. */
export async function ensureContractorJobEarning(
	db: LedgerDb,
	input: JobEarningInput,
) {
	const sourceKey = `JOB:${input.jobId}`;
	const existing = await db.contractorLedgerEntry.findUnique({
		where: { sourceKey },
		include: { reversedBy: { select: { id: true } } },
	});
	if (!existing) {
		return postContractorLedgerEntry(db, {
			...input,
			type: "JOB_EARNED",
			liabilityDelta: input.amount,
			sourceType: "JOB",
			sourceId: String(input.jobId),
			sourceKey,
		});
	}

	const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
	if (
		existing.contractorId !== input.contractorId ||
		existing.type !== "JOB_EARNED" ||
		existing.sourceType !== "JOB" ||
		existing.sourceId !== String(input.jobId) ||
		existing.jobId !== input.jobId ||
		!existing.amount.equals(amount) ||
		!existing.liabilityDelta.equals(amount)
	) {
		throw new Error(
			`Ledger source ${sourceKey} already exists with different accounting values.`,
		);
	}

	// Cancellation reverses the payout, leaving earnings intact. Job rejection
	// reverses earnings; follow that chain before restoring an inactive earning.
	let leaf = existing;
	let depth = 0;
	const visited = new Set([leaf.id]);
	while (leaf.reversedBy) {
		const next = await db.contractorLedgerEntry.findUnique({
			where: { id: leaf.reversedBy.id },
			include: { reversedBy: { select: { id: true } } },
		});
		if (
			!next ||
			visited.has(next.id) ||
			next.reversalOfId !== leaf.id ||
			next.contractorId !== input.contractorId ||
			next.jobId !== input.jobId ||
			next.type !== "REVERSAL" ||
			!next.amount.equals(amount.abs()) ||
			!next.liabilityDelta.equals(leaf.liabilityDelta.negated())
		) {
			throw new Error(
				`Ledger source ${sourceKey} has an inconsistent reversal chain.`,
			);
		}
		visited.add(next.id);
		leaf = next;
		depth += 1;
	}
	if (depth % 2 === 0) return existing;
	if (!input.createdById)
		throw new Error("Restoring job earnings requires an actor.");
	return reverseContractorLedgerEntry(db, {
		entryId: leaf.id,
		effectiveAt: input.effectiveAt,
		reason: `Job #${input.jobId} approved for payout`,
		actorId: input.createdById,
		sourceType: "JOB",
		sourceId: `reapproval:${input.jobId}`,
		sourceKey: `JOB:reapproval:${leaf.id}`,
	});
}
