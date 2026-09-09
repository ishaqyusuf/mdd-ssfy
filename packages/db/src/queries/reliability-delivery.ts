import { randomUUID } from "node:crypto";
import type { Database, TransactionClient } from "../index";

type Destination = "GITHUB" | "SLACK";

export async function getReliabilityDeliveryHealth(
	db: Database,
	input: { serviceId: string; now: Date },
) {
	validateClock(input.now);
	const where = { incident: { serviceId: input.serviceId } };
	const [counts, oldest, expired] = await Promise.all([
		db.reliabilityDelivery.groupBy({
			by: ["destination", "status"],
			where,
			_count: { _all: true },
		}),
		db.reliabilityDelivery.findFirst({
			where: { ...where, status: "PENDING" },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		}),
		db.reliabilityDelivery.count({
			where: {
				...where,
				status: "SENDING",
				leaseExpiresAt: { lte: input.now },
			},
		}),
	]);
	return {
		counts: counts.map((entry) => ({
			destination: entry.destination,
			status: entry.status,
			count: entry._count._all,
		})),
		oldestPendingAt: oldest?.createdAt ?? null,
		expiredSendingCount: expired,
	};
}

export type ReliabilityDeliveryOutcome =
	| { status: "SENT"; remoteId: string }
	| { status: "PENDING"; errorCode: string; retryAt: Date }
	| { status: "FAILED" | "UNCERTAIN" | "SUPPRESSED"; errorCode: string };

function validateClock(now: Date) {
	if (!Number.isFinite(now.getTime()))
		throw new Error("Invalid reliability clock");
}

function validateReceipt(remoteId: string) {
	if (!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,254}$/.test(remoteId))
		throw new Error("Invalid reliability receipt");
}

export function listDueGithubRecoveries(
	db: Database,
	input: {
		serviceIds: readonly string[];
		now: Date;
		limit: number;
	},
) {
	validateClock(input.now);
	if (
		input.serviceIds.length < 1 ||
		input.serviceIds.length > 20 ||
		input.serviceIds.some((id) => !id) ||
		!Number.isInteger(input.limit) ||
		input.limit < 1 ||
		input.limit > 10
	)
		throw new Error("Invalid GitHub recovery selection");
	return db.reliabilityDelivery.findMany({
		where: {
			destination: "GITHUB",
			OR: [
				{ status: "UNCERTAIN", nextAttemptAt: { lte: input.now } },
				{ status: "SENDING", leaseExpiresAt: { lte: input.now } },
			],
			incident: { serviceId: { in: [...input.serviceIds] } },
		},
		orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
		take: input.limit,
		select: { id: true, incident: { select: { serviceId: true } } },
	});
}

export async function expireGithubSender(
	db: Database,
	input: { deliveryId: string; serviceId: string; now: Date },
) {
	validateClock(input.now);
	const delivery = await db.reliabilityDelivery.findUnique({
		where: { id: input.deliveryId },
		select: { incidentId: true },
	});
	if (!delivery) return false;
	return db.$transaction(
		async (tx) => {
			if (!(await lockIncident(tx, delivery.incidentId))) return false;
			const result = await tx.reliabilityDelivery.updateMany({
				where: {
					id: input.deliveryId,
					destination: "GITHUB",
					status: "SENDING",
					leaseExpiresAt: { lte: input.now },
					incident: { serviceId: input.serviceId },
				},
				data: {
					status: "UNCERTAIN",
					lastErrorCode: "LEASE_EXPIRED",
					nextAttemptAt: input.now,
				},
			});
			return result.count === 1;
		},
		{ timeout: 10_000 },
	);
}

export function getUncertainGithubDelivery(
	db: Database,
	input: { deliveryId: string; serviceId: string },
) {
	return db.reliabilityDelivery.findFirst({
		where: {
			id: input.deliveryId,
			destination: "GITHUB",
			status: "UNCERTAIN",
			incident: { serviceId: input.serviceId },
		},
		select: {
			id: true,
			incidentId: true,
			actionKey: true,
			createdAt: true,
			remoteId: true,
		},
	});
}

/** Reserve one recovery scan without making the uncertain write eligible to resend. */
export async function reserveGithubRecoveryScan(
	db: Database,
	input: {
		deliveryId: string;
		serviceId: string;
		now: Date;
	},
) {
	validateClock(input.now);
	const recoveryDelivery = await db.reliabilityDelivery.findUnique({
		where: { id: input.deliveryId },
		select: { incidentId: true },
	});
	if (!recoveryDelivery) return false;
	return db.$transaction(
		async (tx) => {
			if (!(await lockIncident(tx, recoveryDelivery.incidentId))) return false;
			const result = await tx.reliabilityDelivery.updateMany({
				where: {
					id: input.deliveryId,
					destination: "GITHUB",
					status: "UNCERTAIN",
					incident: { serviceId: input.serviceId },
					nextAttemptAt: { lte: input.now },
				},
				data: { nextAttemptAt: new Date(input.now.getTime() + 300_000) },
			});
			return result.count === 1;
		},
		{ timeout: 10_000 },
	);
}

export async function extendGithubRecoveryCooldown(
	db: Database,
	input: {
		deliveryId: string;
		serviceId: string;
		retryAt: Date;
	},
) {
	validateClock(input.retryAt);
	const delivery = await db.reliabilityDelivery.findUnique({
		where: { id: input.deliveryId },
		select: { incidentId: true },
	});
	if (!delivery) return false;
	return db.$transaction(
		async (tx) => {
			if (!(await lockIncident(tx, delivery.incidentId))) return false;
			const changed = await tx.reliabilityDelivery.updateMany({
				where: {
					id: input.deliveryId,
					destination: "GITHUB",
					status: "UNCERTAIN",
					incident: { serviceId: input.serviceId },
					nextAttemptAt: { lt: input.retryAt },
				},
				data: { nextAttemptAt: input.retryAt },
			});
			return changed.count === 1;
		},
		{ timeout: 10_000 },
	);
}

export async function recordReliabilityDeliveryReceipt(
	db: Database,
	input: {
		deliveryId: string;
		actionKey: string;
		remoteId: string;
		now: Date;
	},
) {
	validateClock(input.now);
	validateReceipt(input.remoteId);
	return db.$transaction(
		async (tx) => {
			const delivery = await tx.reliabilityDelivery.findUnique({
				where: { id: input.deliveryId },
			});
			if (!delivery || !(await lockIncident(tx, delivery.incidentId)))
				return false;
			const result = await tx.reliabilityDelivery.updateMany({
				where: {
					id: input.deliveryId,
					actionKey: input.actionKey,
					status: "UNCERTAIN",
				},
				data: {
					status: "SENT",
					remoteId: input.remoteId,
					lastErrorCode: null,
					completedAt: input.now,
					leaseId: null,
					leaseExpiresAt: null,
				},
			});
			return result.count === 1;
		},
		{ timeout: 10_000 },
	);
}

export async function settleReliabilityDelivery(
	db: Database,
	input: {
		deliveryId: string;
		leaseId: string;
		now: Date;
		outcome: ReliabilityDeliveryOutcome;
	},
) {
	validateClock(input.now);
	const outcome = input.outcome;
	if (
		!["SENT", "PENDING", "FAILED", "UNCERTAIN", "SUPPRESSED"].includes(
			outcome.status,
		)
	)
		throw new Error("Invalid reliability outcome");
	if (outcome.status === "SENT") {
		validateReceipt(outcome.remoteId);
	} else {
		if (!/^[A-Z0-9_]{1,80}$/.test(outcome.errorCode))
			throw new Error("Invalid reliability error code");
		if (outcome.status === "PENDING") {
			validateClock(outcome.retryAt);
			if (outcome.retryAt <= input.now)
				throw new Error("Invalid reliability retry time");
		}
	}
	return db.$transaction(
		async (tx) => {
			const delivery = await tx.reliabilityDelivery.findUnique({
				where: { id: input.deliveryId },
			});
			if (!delivery || !(await lockIncident(tx, delivery.incidentId)))
				return false;
			const exhausted = outcome.status === "PENDING" && delivery.attempts >= 5;
			const result = await tx.reliabilityDelivery.updateMany({
				where: {
					id: input.deliveryId,
					status: "SENDING",
					leaseId: input.leaseId,
					leaseExpiresAt: { gt: input.now },
				},
				data: {
					status: exhausted ? "FAILED" : outcome.status,
					leaseId: null,
					leaseExpiresAt: null,
					...(outcome.status === "SENT"
						? { remoteId: outcome.remoteId, lastErrorCode: null }
						: { lastErrorCode: outcome.errorCode }),
					...(outcome.status === "PENDING"
						? { nextAttemptAt: outcome.retryAt }
						: {}),
					...(exhausted ? { lastErrorCode: "RETRY_EXHAUSTED" } : {}),
					completedAt:
						exhausted ||
						["SENT", "SUPPRESSED", "FAILED"].includes(outcome.status)
							? input.now
							: null,
				},
			});
			return result.count === 1;
		},
		{ timeout: 10_000 },
	);
}

async function lockIncident(tx: TransactionClient, incidentId: string) {
	const rows = await tx.$queryRaw<Array<{ id: string }>>`
		SELECT id FROM ReliabilityIncident WHERE id = ${incidentId} FOR UPDATE
	`;
	return rows.length === 1;
}

export async function claimReliabilityDelivery(
	db: Database,
	input: {
		incidentId: string;
		destination: Destination;
		now: Date;
		leaseMs: number;
		publication?: { serviceId: string; revision: number };
	},
) {
	validateClock(input.now);
	if (
		input.publication &&
		(!input.publication.serviceId ||
			!Number.isSafeInteger(input.publication.revision) ||
			input.publication.revision < 1)
	)
		throw new Error("Invalid publication scope");
	if (
		!Number.isInteger(input.leaseMs) ||
		input.leaseMs < 1000 ||
		input.leaseMs > 300_000
	) {
		throw new Error("Invalid reliability lease duration");
	}
	if (!["GITHUB", "SLACK"].includes(input.destination))
		throw new Error("Invalid reliability destination");
	return db.$transaction(
		async (tx) => {
			if (!(await lockIncident(tx, input.incidentId))) return null;
			if (input.publication) {
				const current = await tx.reliabilityIncident.findFirst({
					where: {
						id: input.incidentId,
						serviceId: input.publication.serviceId,
						revision: input.publication.revision,
						severity: { not: "INFO" },
						status: { not: "RESOLVED" },
					},
					select: { id: true },
				});
				if (!current) return null;
			}
			const scope = {
				incidentId: input.incidentId,
				destination: input.destination,
			};
			await tx.reliabilityDelivery.updateMany({
				where: {
					...scope,
					status: "SENDING",
					leaseExpiresAt: { lte: input.now },
				},
				data: { status: "UNCERTAIN", lastErrorCode: "LEASE_EXPIRED" },
			});
			const busy = await tx.reliabilityDelivery.findFirst({
				where: { ...scope, status: { in: ["SENDING", "UNCERTAIN", "FAILED"] } },
			});
			if (busy) return null;
			const waiting = await tx.reliabilityDelivery.findFirst({
				where: {
					...scope,
					status: "PENDING",
					attempts: { gt: 0 },
					nextAttemptAt: { gt: input.now },
				},
			});
			if (waiting) return null;
			const candidate = await tx.reliabilityDelivery.findFirst({
				where: {
					...scope,
					...(input.publication
						? { revision: input.publication.revision }
						: {}),
					status: "PENDING",
					nextAttemptAt: { lte: input.now },
				},
				orderBy: { revision: "desc" },
			});
			if (!candidate) return null;
			// Carry the consecutive retry budget when newer evidence supersedes a retry.
			// Successful delivery ends the chain; later revisions start a fresh budget.
			const retryChain = await tx.reliabilityDelivery.aggregate({
				where: {
					...scope,
					status: "PENDING",
					revision: { lte: candidate.revision },
				},
				_max: { attempts: true },
			});
			const previous = await tx.reliabilityDelivery.findFirst({
				where: { ...scope, status: "SENT", remoteId: { not: null } },
				orderBy: { revision: "desc" },
			});
			await tx.reliabilityDelivery.updateMany({
				where: {
					...scope,
					status: "PENDING",
					revision: { lt: candidate.revision },
				},
				data: {
					status: "SUPPRESSED",
					lastErrorCode: "SUPERSEDED_REVISION",
					completedAt: input.now,
				},
			});
			return tx.reliabilityDelivery.update({
				where: { id: candidate.id },
				data: {
					status: "SENDING",
					attempts: (retryChain._max.attempts ?? 0) + 1,
					leaseId: randomUUID(),
					leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
					remoteId: previous?.remoteId ?? null,
				},
			});
		},
		{ timeout: 10_000 },
	);
}
