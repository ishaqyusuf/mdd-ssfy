import { createHash } from "node:crypto";

import type { Database, Prisma } from "@gnd/db";
import { z } from "zod";

import type { BulkFulfillmentOutcome } from "./bulk-fulfillment";
import type { BulkProductionCompletionOutcome } from "./bulk-production-completion";
import {
	SalesCompletionError,
	type SalesCompletionMilestone,
	type SalesCompletionWriteHooks,
	getSalesCompletionProjection,
	markFulfillmentCompletionStatusOnly,
	markProductionCompletionStatusOnly,
} from "./sales-completion";
import type { SalesPipelineSnapshot } from "./sales-pipeline";
import { evaluateSalesPipelineCommand } from "./sales-pipeline-commands";
import {
	resolveSalesPipelineSnapshotFromOrder,
	salesPipelineOrderSelect,
} from "./sales-pipeline-order";

const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const salesCompletionFallbackAttemptSchema = z.object({
	milestone: z.enum(["PRODUCTION_COMPLETED", "FULFILLMENT_COMPLETED"]),
	fullWorkflowRequestId: z.string().uuid(),
});

export const markSalesCompletionStatusOnlyFallbackSchema =
	salesCompletionFallbackAttemptSchema
		.extend({
			requestId: z.string().uuid(),
			reason: z.string().trim().max(500).optional().default(""),
			effectiveAt: z.coerce.date().optional().nullable(),
			candidates: z
				.array(
					z.object({
						salesOrderId: z.number().int().positive(),
						expectedCompletionRevision: revisionSchema,
						expectedPipelineRevision: revisionSchema,
						administrativeOverrideRequired: z.boolean(),
					}),
				)
				.min(1)
				.max(40),
		})
		.superRefine((input, context) => {
			const seen = new Set<number>();
			for (const [index, candidate] of input.candidates.entries()) {
				if (seen.has(candidate.salesOrderId)) {
					context.addIssue({
						code: "custom",
						message: "Each fallback order may appear only once.",
						path: ["candidates", index, "salesOrderId"],
					});
				}
				seen.add(candidate.salesOrderId);
			}
		});

export type SalesCompletionFullWorkflowOutcome =
	| BulkProductionCompletionOutcome
	| BulkFulfillmentOutcome;

export type SalesCompletionFallbackCandidate = {
	salesOrderId: number;
	orderNo: string | null;
	fullWorkflowStatus: "failed" | "awaiting_review" | "review_required";
	reason: string;
};

function isFallbackStatus(
	status: SalesCompletionFullWorkflowOutcome["status"],
): status is SalesCompletionFallbackCandidate["fullWorkflowStatus"] {
	return (
		status === "failed" ||
		status === "awaiting_review" ||
		status === "review_required"
	);
}

function isFullWorkflowOutcomeStatus(
	milestone: SalesCompletionMilestone,
	status: unknown,
): status is SalesCompletionFullWorkflowOutcome["status"] {
	return milestone === "PRODUCTION_COMPLETED"
		? status === "succeeded" ||
				status === "already_completed" ||
				status === "awaiting_review" ||
				status === "failed"
		: status === "succeeded" ||
				status === "already_fulfilled" ||
				status === "review_required" ||
				status === "failed";
}

function fallbackReason(
	milestone: SalesCompletionMilestone,
	outcome: SalesCompletionFullWorkflowOutcome,
) {
	if (outcome.error?.trim()) return outcome.error.trim();
	if (outcome.status === "awaiting_review") {
		return "Production completion requires review.";
	}
	if (outcome.status === "review_required") {
		return "Fulfillment completion requires review.";
	}
	return milestone === "PRODUCTION_COMPLETED"
		? "Production completion failed."
		: "Fulfillment completion failed.";
}

export function resolveSalesCompletionFallbackCandidates(input: {
	milestone: SalesCompletionMilestone;
	outcomes: readonly SalesCompletionFullWorkflowOutcome[];
}) {
	return input.outcomes.flatMap(
		(outcome): SalesCompletionFallbackCandidate[] =>
			isFallbackStatus(outcome.status)
				? [
						{
							salesOrderId: outcome.salesId,
							orderNo: outcome.orderNo ?? null,
							fullWorkflowStatus: outcome.status,
							reason: fallbackReason(input.milestone, outcome),
						},
					]
				: [],
	);
}

export function buildSalesCompletionFullWorkflowOutcomeHistoryId(input: {
	milestone: SalesCompletionMilestone;
	requestId: string;
	salesOrderId: number;
}) {
	return `sales-completion-full-workflow:${input.milestone}:${input.requestId}:${input.salesOrderId}`;
}

function buildSalesCompletionFullWorkflowOutcomeAudit(input: {
	milestone: SalesCompletionMilestone;
	requestId: string;
	salesOrderId: number;
	orderNo: string | null;
	status: SalesCompletionFullWorkflowOutcome["status"];
	error: string | null;
	actorId: number;
}) {
	const payload = {
		event: "SALES_COMPLETION_FULL_WORKFLOW_OUTCOME",
		requestId: input.requestId,
		milestone: input.milestone,
		salesOrderId: input.salesOrderId,
		orderNo: input.orderNo,
		status: input.status,
		error: input.error,
		actorId: input.actorId,
	};
	return {
		...payload,
		commandFingerprint: createHash("sha256")
			.update(JSON.stringify(payload))
			.digest("hex"),
	};
}

export async function recordSalesCompletionFullWorkflowOutcomes(
	db: Database,
	input: {
		milestone: SalesCompletionMilestone;
		requestId: string;
		actor: { id: number; name: string };
		outcomes: readonly SalesCompletionFullWorkflowOutcome[];
	},
) {
	if (!input.outcomes.length) return;
	const rows = input.outcomes.map((outcome) => {
		return {
			id: buildSalesCompletionFullWorkflowOutcomeHistoryId({
				milestone: input.milestone,
				requestId: input.requestId,
				salesOrderId: outcome.salesId,
			}),
			salesId: outcome.salesId,
			name:
				input.milestone === "PRODUCTION_COMPLETED"
					? "Production full-workflow outcome"
					: "Fulfillment full-workflow outcome",
			authorName: input.actor.name,
			data: buildSalesCompletionFullWorkflowOutcomeAudit({
				milestone: input.milestone,
				requestId: input.requestId,
				salesOrderId: outcome.salesId,
				orderNo: outcome.orderNo ?? null,
				status: outcome.status,
				error: outcome.error?.trim() || null,
				actorId: input.actor.id,
			}) satisfies Prisma.InputJsonObject,
		};
	});
	await db.salesHistory.createMany({
		data: rows,
		skipDuplicates: true,
	});
	const persisted = await db.salesHistory.findMany({
		where: { id: { in: rows.map((row) => row.id) }, deletedAt: null },
		select: { id: true, data: true },
	});
	const persistedById = new Map(persisted.map((row) => [row.id, row.data]));
	for (const row of rows) {
		const data = historyData(persistedById.get(row.id));
		if (
			data?.commandFingerprint !==
			(row.data.commandFingerprint as string | undefined)
		) {
			throw new SalesCompletionError(
				"That full-workflow attempt identity was already used with a different outcome.",
				"IDEMPOTENCY_CONFLICT",
			);
		}
	}
}

type PersistedFullWorkflowOutcome = SalesCompletionFallbackCandidate & {
	historyId: string;
};

export type SalesCompletionFallbackPreviewItem =
	PersistedFullWorkflowOutcome & {
		eligible: boolean;
		administrativeOverrideRequired: boolean;
		completionRevision: string | null;
		pipelineRevision: string | null;
		blockedReason: string | null;
	};

export type SalesCompletionFallbackPreview = {
	milestone: SalesCompletionMilestone;
	fullWorkflowRequestId: string;
	items: SalesCompletionFallbackPreviewItem[];
	eligibleCount: number;
	blockedCount: number;
};

export function resolveSalesCompletionFallbackEligibility(input: {
	milestone: SalesCompletionMilestone;
	pipeline: SalesPipelineSnapshot;
}) {
	const action =
		input.milestone === "PRODUCTION_COMPLETED"
			? "production.administrative_complete"
			: "fulfillment.administrative_complete";
	const ordinary = evaluateSalesPipelineCommand(input.pipeline, {
		action,
		authorized: true,
		expectedRevision: input.pipeline.revision,
	});
	const override =
		ordinary.status === "review_required"
			? evaluateSalesPipelineCommand(input.pipeline, {
					action,
					authorized: true,
					expectedRevision: input.pipeline.revision,
					administrativeOverride: true,
					administrativeOverrideReason: "Fallback preview",
				})
			: null;
	const administrativeOverrideRequired = override?.status === "ready";
	const eligible =
		ordinary.status === "ready" || administrativeOverrideRequired;
	return {
		eligible,
		administrativeOverrideRequired,
		blockedReason: eligible
			? null
			: [...ordinary.reasons, ...(override?.reasons ?? [])].join(", ") ||
				"Status-only completion is unavailable for the current state.",
	};
}

function historyData(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function hasPrismaUniqueConflict(error: unknown) {
	return (
		Boolean(error) &&
		typeof error === "object" &&
		String((error as { code?: unknown }).code ?? "") === "P2002"
	);
}

async function loadPersistedFullWorkflowOutcomes(
	db: Database,
	input: z.infer<typeof salesCompletionFallbackAttemptSchema>,
) {
	const prefix = `sales-completion-full-workflow:${input.milestone}:${input.fullWorkflowRequestId}:`;
	const rows = await db.salesHistory.findMany({
		where: { id: { startsWith: prefix }, deletedAt: null },
		select: { id: true, salesId: true, data: true },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
	return rows.flatMap((row): PersistedFullWorkflowOutcome[] => {
		const data = historyData(row.data);
		const status = data?.status;
		const orderNo =
			typeof data?.orderNo === "string"
				? data.orderNo
				: data?.orderNo === null
					? null
					: undefined;
		const error =
			typeof data?.error === "string"
				? data.error
				: data?.error === null
					? null
					: undefined;
		const actorId = data?.actorId;
		if (
			data?.event !== "SALES_COMPLETION_FULL_WORKFLOW_OUTCOME" ||
			data.requestId !== input.fullWorkflowRequestId ||
			data.milestone !== input.milestone ||
			data.salesOrderId !== row.salesId ||
			row.id !==
				buildSalesCompletionFullWorkflowOutcomeHistoryId({
					milestone: input.milestone,
					requestId: input.fullWorkflowRequestId,
					salesOrderId: row.salesId,
				}) ||
			orderNo === undefined ||
			error === undefined ||
			!Number.isInteger(actorId) ||
			!isFullWorkflowOutcomeStatus(input.milestone, status)
		) {
			throw new SalesCompletionError(
				"A full-workflow outcome audit record is invalid.",
				"PERSISTENCE_FAILURE",
			);
		}
		const expectedAudit = buildSalesCompletionFullWorkflowOutcomeAudit({
			milestone: input.milestone,
			requestId: input.fullWorkflowRequestId,
			salesOrderId: row.salesId,
			orderNo,
			status,
			error,
			actorId: actorId as number,
		});
		if (data.commandFingerprint !== expectedAudit.commandFingerprint) {
			throw new SalesCompletionError(
				"A full-workflow outcome audit record failed integrity verification.",
				"PERSISTENCE_FAILURE",
			);
		}
		if (!isFallbackStatus(status)) return [];
		return [
			{
				historyId: row.id,
				salesOrderId: row.salesId,
				orderNo,
				fullWorkflowStatus: status,
				reason:
					typeof data.error === "string" && data.error.trim()
						? data.error.trim()
						: status === "awaiting_review"
							? "Production completion requires review."
							: status === "review_required"
								? "Fulfillment completion requires review."
								: input.milestone === "PRODUCTION_COMPLETED"
									? "Production completion failed."
									: "Fulfillment completion failed.",
			},
		];
	});
}

async function getFallbackPipelineSnapshot(db: Database, salesOrderId: number) {
	const order = await db.salesOrders.findFirst({
		where: { id: salesOrderId, type: "order", deletedAt: null },
		select: salesPipelineOrderSelect,
	});
	return order ? resolveSalesPipelineSnapshotFromOrder(order) : null;
}

async function mapWithConcurrency<T, R>(
	items: readonly T[],
	concurrency: number,
	mapper: (item: T) => Promise<R>,
) {
	const results: R[] = [];
	for (let offset = 0; offset < items.length; offset += concurrency) {
		const chunk = items.slice(offset, offset + concurrency);
		results.push(...(await Promise.all(chunk.map(mapper))));
	}
	return results;
}

export async function getSalesCompletionStatusOnlyFallbackPreview(
	db: Database,
	input: z.infer<typeof salesCompletionFallbackAttemptSchema>,
): Promise<SalesCompletionFallbackPreview> {
	const outcomes = await loadPersistedFullWorkflowOutcomes(db, input);
	const items = await mapWithConcurrency(
		outcomes,
		5,
		async (outcome): Promise<SalesCompletionFallbackPreviewItem> => {
			try {
				const [completion, pipeline] = await Promise.all([
					getSalesCompletionProjection(db, {
						salesOrderId: outcome.salesOrderId,
					}),
					getFallbackPipelineSnapshot(db, outcome.salesOrderId),
				]);
				if (!pipeline) {
					return {
						...outcome,
						eligible: false,
						administrativeOverrideRequired: false,
						completionRevision: completion.revision,
						pipelineRevision: null,
						blockedReason: "The sales order is no longer available.",
					};
				}
				const eligibility = resolveSalesCompletionFallbackEligibility({
					milestone: input.milestone,
					pipeline,
				});
				return {
					...outcome,
					...eligibility,
					completionRevision: completion.revision,
					pipelineRevision: pipeline.revision,
				};
			} catch (error) {
				if (!(error instanceof SalesCompletionError)) {
					console.error("Unable to verify a Sales completion fallback row", {
						error,
						salesOrderId: outcome.salesOrderId,
					});
				}
				return {
					...outcome,
					eligible: false,
					administrativeOverrideRequired: false,
					completionRevision: null,
					pipelineRevision: null,
					blockedReason:
						error instanceof SalesCompletionError
							? error.message
							: "The current order state could not be verified.",
				};
			}
		},
	);
	return {
		...input,
		items,
		eligibleCount: items.filter((item) => item.eligible).length,
		blockedCount: items.filter((item) => !item.eligible).length,
	};
}

function fallbackItemRequestId(input: {
	requestId: string;
	milestone: SalesCompletionMilestone;
	salesOrderId: number;
}) {
	const digest = createHash("sha256")
		.update(
			`${input.requestId}:${input.milestone}:${input.salesOrderId}:fallback`,
		)
		.digest("hex");
	const uuidHex = `${digest.slice(0, 12)}5${digest.slice(13, 16)}8${digest.slice(17, 32)}`;
	return [
		uuidHex.slice(0, 8),
		uuidHex.slice(8, 12),
		uuidHex.slice(12, 16),
		uuidHex.slice(16, 20),
		uuidHex.slice(20, 32),
	].join("-");
}

export type SalesCompletionStatusOnlyFallbackItem = {
	salesOrderId: number;
	status: "completed" | "replayed" | "skipped" | "failed";
	code: string | null;
	message: string | null;
};

export type SalesCompletionStatusOnlyFallbackResult = {
	fullWorkflowRequestId: string;
	requestId: string;
	requested: number;
	completed: number;
	replayed: number;
	skipped: number;
	failed: number;
	items: SalesCompletionStatusOnlyFallbackItem[];
};

export type SalesCompletionStatusOnlyFallbackDependencies = {
	getPreview: typeof getSalesCompletionStatusOnlyFallbackPreview;
	markProduction: typeof markProductionCompletionStatusOnly;
	markFulfillment: typeof markFulfillmentCompletionStatusOnly;
};

const defaultFallbackDependencies: SalesCompletionStatusOnlyFallbackDependencies =
	{
		getPreview: getSalesCompletionStatusOnlyFallbackPreview,
		markProduction: markProductionCompletionStatusOnly,
		markFulfillment: markFulfillmentCompletionStatusOnly,
	};

export async function markSalesCompletionStatusOnlyFallback(
	db: Database,
	input: z.infer<typeof markSalesCompletionStatusOnlyFallbackSchema>,
	actor: { id: number; name: string },
	hooks: SalesCompletionWriteHooks = {},
	dependencies: SalesCompletionStatusOnlyFallbackDependencies = defaultFallbackDependencies,
): Promise<SalesCompletionStatusOnlyFallbackResult> {
	const preview = await dependencies.getPreview(db, input);
	const previewBySalesId = new Map(
		preview.items.map((item) => [item.salesOrderId, item]),
	);
	const normalizedCandidates = [...input.candidates].sort(
		(left, right) => left.salesOrderId - right.salesOrderId,
	);
	const identityPayload = {
		event: "SALES_COMPLETION_STATUS_ONLY_FALLBACK_DECISION",
		requestId: input.requestId,
		fullWorkflowRequestId: input.fullWorkflowRequestId,
		milestone: input.milestone,
		reason: input.reason.trim(),
		effectiveAt: input.effectiveAt?.toISOString() ?? null,
		candidates: normalizedCandidates,
	};
	const fingerprint = createHash("sha256")
		.update(JSON.stringify(identityPayload))
		.digest("hex");
	const historyId = `sales-completion-fallback:${input.milestone}:${input.requestId}`;
	const existingDecision = await db.salesHistory.findUnique({
		where: { id: historyId },
		select: { data: true },
	});
	const idempotentDecisionReplay = Boolean(existingDecision);
	const assertDecisionFingerprint = (value: unknown) => {
		const persisted = historyData(value);
		if (persisted?.commandFingerprint !== fingerprint) {
			throw new SalesCompletionError(
				"That fallback idempotency identity was already used with a different payload.",
				"IDEMPOTENCY_CONFLICT",
			);
		}
	};
	if (existingDecision) {
		assertDecisionFingerprint(existingDecision.data);
	} else {
		try {
			await db.salesHistory.create({
				data: {
					id: historyId,
					salesId: normalizedCandidates[0]?.salesOrderId as number,
					name: "Status-only completion fallback decision",
					authorName: actor.name,
					data: {
						...identityPayload,
						actorId: actor.id,
						commandFingerprint: fingerprint,
					} satisfies Prisma.InputJsonObject,
				},
			});
		} catch (error) {
			if (!hasPrismaUniqueConflict(error)) throw error;
			const racedDecision = await db.salesHistory.findUnique({
				where: { id: historyId },
				select: { data: true },
			});
			if (!racedDecision) throw error;
			assertDecisionFingerprint(racedDecision.data);
		}
	}

	const items: SalesCompletionStatusOnlyFallbackItem[] = [];
	for (const candidate of normalizedCandidates) {
		const current = previewBySalesId.get(candidate.salesOrderId);
		if (!current) {
			items.push({
				salesOrderId: candidate.salesOrderId,
				status: "skipped",
				code: "INVALID_TRANSITION",
				message: "This order was not an unsuccessful full-workflow outcome.",
			});
			continue;
		}
		if (
			!idempotentDecisionReplay &&
			(!current.eligible ||
				!current.pipelineRevision ||
				current.administrativeOverrideRequired !==
					candidate.administrativeOverrideRequired)
		) {
			items.push({
				salesOrderId: candidate.salesOrderId,
				status: "skipped",
				code: "INVALID_TRANSITION",
				message:
					current.blockedReason ??
					"Status-only fallback is unavailable for the current state.",
			});
			continue;
		}
		if (
			!idempotentDecisionReplay &&
			(current.completionRevision !== candidate.expectedCompletionRevision ||
				current.pipelineRevision !== candidate.expectedPipelineRevision)
		) {
			items.push({
				salesOrderId: candidate.salesOrderId,
				status: "failed",
				code: "STALE_STATE",
				message:
					"The order changed after the fallback confirmation opened. Refresh and try again.",
			});
			continue;
		}
		try {
			const markInput = {
				salesOrderId: candidate.salesOrderId,
				requestId: fallbackItemRequestId({
					requestId: input.requestId,
					milestone: input.milestone,
					salesOrderId: candidate.salesOrderId,
				}),
				reason: input.reason,
				expectedRevision: candidate.expectedCompletionRevision,
				effectiveAt: input.effectiveAt ?? null,
				fallback: {
					fallbackDecisionRequestId: input.requestId,
					fullWorkflowRequestId: input.fullWorkflowRequestId,
					fullWorkflowStatus: current.fullWorkflowStatus,
					fullWorkflowReason: current.reason,
					expectedPipelineRevision: candidate.expectedPipelineRevision,
				},
				administrativeOverride: candidate.administrativeOverrideRequired
					? {
							reason: input.reason,
							expectedRevision: candidate.expectedPipelineRevision,
						}
					: null,
			};
			const result =
				input.milestone === "PRODUCTION_COMPLETED"
					? await dependencies.markProduction(db, markInput, actor, hooks)
					: await dependencies.markFulfillment(db, markInput, actor, hooks);
			items.push({
				salesOrderId: candidate.salesOrderId,
				status: result.idempotentReplay ? "replayed" : "completed",
				code: null,
				message: null,
			});
		} catch (error) {
			const completionError =
				error instanceof SalesCompletionError ? error : null;
			items.push({
				salesOrderId: candidate.salesOrderId,
				status:
					completionError?.code === "INVALID_TRANSITION" ? "skipped" : "failed",
				code: completionError?.code ?? "PERSISTENCE_FAILURE",
				message:
					completionError?.message ??
					"The status-only fallback could not be saved.",
			});
		}
	}

	return {
		fullWorkflowRequestId: input.fullWorkflowRequestId,
		requestId: input.requestId,
		requested: normalizedCandidates.length,
		completed: items.filter((item) => item.status === "completed").length,
		replayed: items.filter((item) => item.status === "replayed").length,
		skipped: items.filter((item) => item.status === "skipped").length,
		failed: items.filter((item) => item.status === "failed").length,
		items,
	};
}
