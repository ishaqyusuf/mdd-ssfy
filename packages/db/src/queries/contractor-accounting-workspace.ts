import type {
	ContractorAccountingAlertEventStatus,
	ContractorAccountingAlertKind,
	ContractorPayoutRunStatus,
	Prisma,
} from "@prisma/client";
import type { Db } from "../index";

export async function listContractorPayoutRuns(
	db: Db,
	input: {
		statuses?: ContractorPayoutRunStatus[] | null;
		contractorIds?: number[] | null;
		take?: number;
	},
) {
	const rows = await db.contractorPayoutRun.findMany({
		where: {
			...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
			...(input.contractorIds?.length
				? { contractorId: { in: input.contractorIds } }
				: {}),
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: Math.min(input.take ?? 100, 200),
	});
	const contractorIds = [...new Set(rows.map((row) => row.contractorId))];
	const contractors = contractorIds.length
		? await db.users.findMany({
				where: { id: { in: contractorIds }, deletedAt: null },
				select: { id: true, name: true },
			})
		: [];
	const contractorMap = new Map(contractors.map((row) => [row.id, row]));
	return rows.map((row) => ({
		...row,
		contractor: contractorMap.get(row.contractorId) ?? null,
	}));
}

export function createContractorPayoutRun(
	db: Db,
	input: {
		contractorId: number;
		jobIds: number[];
		filters?: Prisma.InputJsonValue | null;
		proposedAmount: Prisma.Decimal | string | number;
		snapshot: Prisma.InputJsonValue;
		snapshotHash: string;
		note?: string | null;
		createdById: number;
	},
) {
	return db.contractorPayoutRun.create({
		data: {
			...input,
			jobIds: input.jobIds,
			filters: input.filters ?? undefined,
		},
	});
}

export async function updateContractorPayoutRunStatus(
	db: Db,
	input: {
		id: string;
		status: "READY" | "HANDED_OFF" | "COMPLETED" | "CANCELLED";
		actorId: number;
		reason?: string | null;
		paymentId?: number | null;
	},
) {
	const run = await db.contractorPayoutRun.findUnique({
		where: { id: input.id },
	});
	if (!run) throw new Error("Contractor payout run was not found.");
	if (["COMPLETED", "CANCELLED"].includes(run.status)) {
		throw new Error("Completed or cancelled payout runs cannot be changed.");
	}
	const allowed: Record<string, string[]> = {
		DRAFT: ["READY", "CANCELLED"],
		READY: ["HANDED_OFF", "CANCELLED"],
		HANDED_OFF: ["COMPLETED", "CANCELLED"],
	};
	if (!allowed[run.status]?.includes(input.status)) {
		throw new Error(
			`Payout run cannot move from ${run.status} to ${input.status}.`,
		);
	}
	return db.contractorPayoutRun.update({
		where: { id: run.id, updatedAt: run.updatedAt },
		data: {
			status: input.status,
			...(input.status === "READY"
				? { reviewedById: input.actorId, reviewedAt: new Date() }
				: {}),
			...(input.status === "HANDED_OFF" ? { handedOffAt: new Date() } : {}),
			...(input.status === "COMPLETED"
				? { completedAt: new Date(), paymentId: input.paymentId }
				: {}),
			...(input.status === "CANCELLED"
				? {
						cancelledAt: new Date(),
						cancelledById: input.actorId,
						cancellationReason: input.reason,
					}
				: {}),
		},
	});
}

export function listContractorAccountingAlertRules(db: Db) {
	return db.contractorAccountingAlertRule.findMany({
		orderBy: [{ enabled: "desc" }, { createdAt: "desc" }],
		take: 200,
	});
}

export function createContractorAccountingAlertRule(
	db: Db,
	input: {
		name: string;
		kind: ContractorAccountingAlertKind;
		enabled?: boolean;
		contractorId?: number | null;
		thresholdAmount?: Prisma.Decimal | string | number | null;
		thresholdDays?: number | null;
		timezone: string;
		recipients: Prisma.InputJsonValue;
		filters?: Prisma.InputJsonValue | null;
		createdById: number;
	},
) {
	return db.contractorAccountingAlertRule.create({
		data: {
			...input,
			filters: input.filters ?? undefined,
		},
	});
}

export function updateContractorAccountingAlertRule(
	db: Db,
	input: {
		id: string;
		enabled?: boolean;
		name?: string;
		thresholdAmount?: Prisma.Decimal | string | number | null;
		thresholdDays?: number | null;
		recipients?: Prisma.InputJsonValue;
	},
) {
	const { id, ...data } = input;
	return db.contractorAccountingAlertRule.update({
		where: { id },
		data,
	});
}

export function listContractorAccountingAlertEvents(
	db: Db,
	input: {
		statuses?: ContractorAccountingAlertEventStatus[] | null;
		contractorIds?: number[] | null;
		take?: number;
	},
) {
	return db.contractorAccountingAlertEvent.findMany({
		where: {
			...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
			...(input.contractorIds?.length
				? { contractorId: { in: input.contractorIds } }
				: {}),
		},
		include: { rule: { select: { id: true, name: true, kind: true } } },
		orderBy: [{ triggeredAt: "desc" }, { id: "desc" }],
		take: Math.min(input.take ?? 100, 200),
	});
}

export function recordContractorAccountingAlertEvent(
	db: Db,
	input: {
		ruleId: string;
		contractorId?: number | null;
		fingerprint: string;
		title: string;
		message: string;
		evidence: Prisma.InputJsonValue;
	},
) {
	return db.contractorAccountingAlertEvent.upsert({
		where: {
			ruleId_fingerprint: {
				ruleId: input.ruleId,
				fingerprint: input.fingerprint,
			},
		},
		create: input,
		update: {
			title: input.title,
			message: input.message,
			evidence: input.evidence,
		},
	});
}

export async function updateContractorAccountingAlertEventStatus(
	db: Db,
	input: {
		id: string;
		status: "ACKNOWLEDGED" | "RESOLVED";
		actorId: number;
	},
) {
	const event = await db.contractorAccountingAlertEvent.findUnique({
		where: { id: input.id },
	});
	if (!event) throw new Error("Accounting alert was not found.");
	return db.contractorAccountingAlertEvent.update({
		where: { id: event.id },
		data:
			input.status === "ACKNOWLEDGED"
				? {
						status: input.status,
						acknowledgedAt: new Date(),
						acknowledgedById: input.actorId,
					}
				: { status: input.status, resolvedAt: new Date() },
	});
}
