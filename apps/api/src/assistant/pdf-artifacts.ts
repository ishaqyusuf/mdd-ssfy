import { createHash, randomUUID } from "node:crypto";
import { buildSalesDocumentTypeKey } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmup } from "@api/utils/sales-document-warm";
import type { Database } from "@gnd/db";
import { runs } from "@trigger.dev/sdk/v3";

export const assistantSalesPdfModes = [
	"invoice",
	"quote",
	"packing-slip",
	"production",
	"order-packing",
] as const;

export type AssistantSalesPdfMode = (typeof assistantSalesPdfModes)[number];

type QueuePdfTrigger = typeof queueSalesDocumentSnapshotWarmup;
const DISPATCH_CLAIM_LEASE_MS = 2 * 60 * 1000;

function isDispatchClaim(value: string | null | undefined) {
	return value?.startsWith("dispatching:") ?? false;
}

function isExpiredDispatchClaim(input: {
	providerJobId: string | null;
	updatedAt: Date | null | undefined;
	now?: number;
}) {
	return (
		isDispatchClaim(input.providerJobId) &&
		input.updatedAt != null &&
		input.updatedAt.getTime() <=
			(input.now ?? Date.now()) - DISPATCH_CLAIM_LEASE_MS
	);
}

function stableJobKey(input: {
	salesOrderId: number;
	sourceRevision: string;
	mode: AssistantSalesPdfMode;
}) {
	return createHash("sha256")
		.update(
			JSON.stringify([
				"assistant-sales-pdf-v1",
				input.salesOrderId,
				input.sourceRevision,
				input.mode,
			]),
		)
		.digest("hex");
}

function isRetryableSnapshotRace(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error)) return false;
	return error.code === "P2002" || error.code === "P2034";
}

type AssistantPdfStatus =
	| "on_demand"
	| "queued"
	| "running"
	| "ready"
	| "stale"
	| "failed"
	| "cancelled";

function snapshotMeta(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function iso(value: Date | null | undefined) {
	return value?.toISOString() ?? null;
}

function mapStatus(status: string | null | undefined): AssistantPdfStatus {
	switch (status) {
		case "pending":
			return "queued";
		case "generating":
			return "running";
		case "ready":
		case "stale":
		case "failed":
		case "cancelled":
			return status;
		default:
			return "on_demand";
	}
}

export function isAssistantSalesPdfModeSupported(input: {
	salesType: string;
	mode: AssistantSalesPdfMode;
}) {
	return input.salesType === "quote"
		? input.mode === "quote"
		: input.mode !== "quote";
}

export async function getAssistantSalesPdfStatus(
	db: Database,
	input: {
		salesOrderId: number;
		sourceRevision: string | null;
		mode: AssistantSalesPdfMode;
		snapshotId?: string;
	},
) {
	const documentType = buildSalesDocumentTypeKey({ mode: input.mode });
	const snapshot = await db.salesDocumentSnapshot.findFirst({
		where: {
			...(input.snapshotId ? { id: input.snapshotId } : {}),
			salesOrderId: input.salesOrderId,
			documentType,
			...(input.snapshotId ? {} : { isCurrent: true }),
			deletedAt: null,
		},
		orderBy: { version: "desc" },
		select: {
			id: true,
			isCurrent: true,
			storedDocumentId: true,
			generationStatus: true,
			sourceUpdatedAt: true,
			generatedAt: true,
			failedAt: true,
			updatedAt: true,
			meta: true,
		},
	});
	if (!snapshot) {
		return {
			mode: input.mode,
			documentType,
			status: "on_demand" as const,
			snapshotId: null,
			documentId: null,
			generatedAt: null,
			sourceUpdatedAt: null,
			expiresAt: null,
			revision: `pdf:${input.salesOrderId}:${documentType}:none`,
		};
	}

	const document = snapshot.storedDocumentId
		? await db.storedDocument.findFirst({
				where: {
					id: snapshot.storedDocumentId,
					ownerType: "sales_order",
					ownerId: String(input.salesOrderId),
					kind: `sales_pdf_snapshot:${documentType}`,
					visibility: "public",
					generated: true,
					sourceType: "sales_document_snapshot",
					sourceId: snapshot.id,
					status: "ready",
					isCurrent: true,
					deletedAt: null,
				},
				select: { id: true },
			})
		: null;
	const meta = snapshotMeta(snapshot.meta);
	const storedRevision =
		typeof meta.sourceRevision === "string" ? meta.sourceRevision : null;
	const expiresAt = typeof meta.expiresAt === "string" ? meta.expiresAt : null;
	const expiry = expiresAt ? new Date(expiresAt).getTime() : null;
	const mappedStatus = mapStatus(snapshot.generationStatus);
	const sourceIsStale =
		input.sourceRevision == null ||
		storedRevision == null ||
		storedRevision !== input.sourceRevision;
	const stale =
		["ready", "queued", "running"].includes(mappedStatus) &&
		(!snapshot.isCurrent ||
			sourceIsStale ||
			(mappedStatus === "ready" &&
				(expiry == null || Number.isNaN(expiry) || expiry <= Date.now())));
	const status =
		stale
			? ("stale" as const)
			: !document && snapshot.generationStatus === "ready"
					? ("failed" as const)
					: mapStatus(snapshot.generationStatus);

	return {
		mode: input.mode,
		documentType,
		status,
		snapshotId: snapshot.id,
		documentId:
			status === "ready" && snapshot.isCurrent ? (document?.id ?? null) : null,
		generatedAt: iso(snapshot.generatedAt),
		sourceUpdatedAt: iso(snapshot.sourceUpdatedAt),
		expiresAt,
		revision: `pdf:${snapshot.id}:${snapshot.updatedAt?.toISOString() ?? "unknown"}`,
	};
}

export async function queueAssistantSalesPdfJob(
	db: Database,
	input: {
		salesOrderId: number;
		salesUpdatedAt: string;
		sourceRevision: string;
		mode: AssistantSalesPdfMode;
		forceRegenerate?: boolean;
		actor: {
			userId: number;
			scopeType: "organization" | "user";
			scopeId: string;
		};
	},
	trigger: QueuePdfTrigger = queueSalesDocumentSnapshotWarmup,
	cancelRun: (runId: string) => Promise<unknown> = (runId) =>
		runs.cancel(runId),
) {
	const sourceUpdatedAt = new Date(input.salesUpdatedAt);
	if (Number.isNaN(sourceUpdatedAt.getTime())) {
		throw new Error("Sales PDF source revision is invalid");
	}
	const documentType = buildSalesDocumentTypeKey({ mode: input.mode });
	const idempotencyKey = stableJobKey(input);
	let prepared:
		| {
				snapshot: {
					id: string;
					generationStatus: string;
					meta: unknown;
					providerJobId: string | null;
					updatedAt: Date | null;
				};
				reused: boolean;
		  }
		| undefined;
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			prepared = await db.$transaction(
				async (tx) => {
					const current = await tx.salesDocumentSnapshot.findFirst({
						where: {
							salesOrderId: input.salesOrderId,
							documentType,
							isCurrent: true,
							deletedAt: null,
							generationStatus: {
								in: input.forceRegenerate
									? ["pending", "generating"]
									: ["pending", "generating", "ready"],
							},
							sourceUpdatedAt,
						},
					});
					if (
						current &&
						snapshotMeta(current.meta).sourceRevision === input.sourceRevision
					)
						return { snapshot: current, reused: true };

					const latest = await tx.salesDocumentSnapshot.findFirst({
						where: {
							salesOrderId: input.salesOrderId,
							documentType,
							deletedAt: null,
						},
						orderBy: { version: "desc" },
						select: { version: true },
					});
					await tx.salesDocumentSnapshot.updateMany({
						where: {
							salesOrderId: input.salesOrderId,
							documentType,
							isCurrent: true,
							deletedAt: null,
						},
						data: {
							isCurrent: false,
							generationStatus: "stale",
							invalidatedAt: new Date(),
						},
					});
					const snapshot = await tx.salesDocumentSnapshot.create({
						data: {
							salesOrderId: input.salesOrderId,
							documentType,
							version: (latest?.version ?? 0) + 1,
							generationStatus: "pending",
							isCurrent: true,
							sourceUpdatedAt,
							meta: {
								mode: input.mode,
								assistantJobKey: idempotencyKey,
								sourceRevision: input.sourceRevision,
								requestedByUserId: input.actor.userId,
								scopeType: input.actor.scopeType,
								scopeId: input.actor.scopeId,
							},
						},
					});
					return { snapshot, reused: false };
				},
				{ isolationLevel: "Serializable" },
			);
			break;
		} catch (error) {
			if (attempt === 3 || !isRetryableSnapshotRace(error)) throw error;
		}
	}
	if (!prepared) throw new Error("Sales PDF job could not be prepared");
	const providerIdempotencyKey = `assistant-sales-pdf:${prepared.snapshot.id}`;
	const dispatchClaim = `dispatching:${prepared.snapshot.id}:${randomUUID()}`;

	const existingRunId = prepared.snapshot.providerJobId;
	if (
		prepared.reused &&
		(prepared.snapshot.generationStatus !== "pending" ||
			(existingRunId &&
				!isExpiredDispatchClaim({
					providerJobId: existingRunId,
					updatedAt: prepared.snapshot.updatedAt,
				})))
	) {
		return {
			jobId: prepared.snapshot.id,
			triggerRunId: isDispatchClaim(existingRunId) ? null : existingRunId,
			status: mapStatus(prepared.snapshot.generationStatus),
			reused: true,
		};
	}
	const recoveringClaim = isExpiredDispatchClaim({
		providerJobId: existingRunId,
		updatedAt: prepared.snapshot.updatedAt,
	});
	const dispatch = await db.salesDocumentSnapshot.updateMany({
		where: {
			id: prepared.snapshot.id,
			generationStatus: "pending",
			isCurrent: true,
			deletedAt: null,
			providerJobId: recoveringClaim ? existingRunId : null,
		},
		data: { providerJobId: dispatchClaim },
	});
	if (dispatch.count !== 1) {
		const observed = await db.salesDocumentSnapshot.findUnique({
			where: { id: prepared.snapshot.id },
			select: { generationStatus: true, providerJobId: true },
		});
		return {
			jobId: prepared.snapshot.id,
			triggerRunId: isDispatchClaim(observed?.providerJobId)
				? null
				: (observed?.providerJobId ?? null),
			status: mapStatus(observed?.generationStatus),
			reused: true,
		};
	}

	try {
		const queued = await trigger({
			snapshotId: prepared.snapshot.id,
			salesOrderId: input.salesOrderId,
			mode: input.mode,
			forceRegenerate: input.forceRegenerate,
			idempotencyKey: providerIdempotencyKey,
			assistantRequest: {
				userId: input.actor.userId,
				scopeType: input.actor.scopeType,
				scopeId: input.actor.scopeId,
				sourceRevision: input.sourceRevision,
			},
		});
		const triggerRunId =
			queued && typeof queued === "object" && "id" in queued
				? String(queued.id)
				: null;
		if (!triggerRunId) {
			await db.salesDocumentSnapshot.updateMany({
				where: {
					id: prepared.snapshot.id,
					generationStatus: "pending",
					providerJobId: dispatchClaim,
				},
				data: {
					generationStatus: "failed",
					isCurrent: false,
					failedAt: new Date(),
					errorMessage: "PDF generation is not available.",
				},
			});
			return {
				jobId: prepared.snapshot.id,
				triggerRunId: null,
				status: "failed" as const,
				reused: prepared.reused,
			};
		}
		const attached = await db.salesDocumentSnapshot.updateMany({
			where: {
				id: prepared.snapshot.id,
				generationStatus: { in: ["pending", "generating"] },
				isCurrent: true,
				providerJobId: dispatchClaim,
			},
			data: { providerJobId: triggerRunId },
		});
		if (attached.count !== 1) {
			const observed = await db.salesDocumentSnapshot.findUnique({
				where: { id: prepared.snapshot.id },
				select: {
					generationStatus: true,
					providerJobId: true,
					isCurrent: true,
				},
			});
			if (
				observed?.providerJobId === triggerRunId &&
				mapStatus(observed.generationStatus) !== "on_demand"
			) {
				return {
					jobId: prepared.snapshot.id,
					triggerRunId,
					status: mapStatus(observed.generationStatus),
					reused: prepared.reused,
				};
			}
			await cancelRun(triggerRunId).catch(() => undefined);
			return {
				jobId: prepared.snapshot.id,
				triggerRunId: null,
				status: "cancelled" as const,
				reused: prepared.reused,
			};
		}
		return {
			jobId: prepared.snapshot.id,
			triggerRunId,
			status: "queued" as const,
			reused: prepared.reused,
		};
	} catch (error) {
		await db.salesDocumentSnapshot.updateMany({
			where: {
				id: prepared.snapshot.id,
				generationStatus: "pending",
				providerJobId: dispatchClaim,
			},
			data: {
				generationStatus: "failed",
				isCurrent: false,
				failedAt: new Date(),
				errorMessage: "PDF generation could not be queued.",
			},
		});
		throw error;
	}
}

export async function cancelAssistantSalesPdfJob(
	db: Database,
	input: {
		snapshotId: string;
		salesOrderId: number;
		mode: AssistantSalesPdfMode;
	},
	cancelRun: (runId: string) => Promise<unknown> = (runId) =>
		runs.cancel(runId),
) {
	const documentType = buildSalesDocumentTypeKey({ mode: input.mode });
	const snapshot = await db.salesDocumentSnapshot.findFirst({
		where: {
			id: input.snapshotId,
			salesOrderId: input.salesOrderId,
			documentType,
			isCurrent: true,
			deletedAt: null,
			generationStatus: { in: ["pending", "generating"] },
		},
		select: { id: true, providerJobId: true },
	});
	if (!snapshot) return false;
	const updated = await db.salesDocumentSnapshot.updateMany({
		where: {
			id: snapshot.id,
			isCurrent: true,
			generationStatus: { in: ["pending", "generating"] },
		},
		data: {
			generationStatus: "cancelled",
			isCurrent: false,
			invalidatedAt: new Date(),
			errorMessage: null,
		},
	});
	if (updated.count !== 1) return false;
	const triggerRunId = snapshot.providerJobId;
	if (typeof triggerRunId === "string" && !isDispatchClaim(triggerRunId)) {
		await cancelRun(triggerRunId).catch(() => undefined);
	}
	return true;
}
