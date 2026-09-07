import { describe, expect, test } from "bun:test";

import type { BulkFulfillmentOutcome } from "./bulk-fulfillment";
import type { BulkProductionCompletionOutcome } from "./bulk-production-completion";
import { markProductionCompletionStatusOnlySchema } from "./sales-completion";
import {
	buildSalesCompletionFullWorkflowOutcomeHistoryId,
	getSalesCompletionStatusOnlyFallbackPreview,
	markSalesCompletionStatusOnlyFallback,
	markSalesCompletionStatusOnlyFallbackSchema,
	recordSalesCompletionFullWorkflowOutcomes,
	resolveSalesCompletionFallbackCandidates,
	resolveSalesCompletionFallbackEligibility,
} from "./sales-completion-fallback";
import {
	type SalesPipelineEvidence,
	resolveSalesPipelineSnapshot,
} from "./sales-pipeline";

function pipeline(overrides: Partial<SalesPipelineEvidence> = {}) {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 41,
		orderNo: "ORDER-41",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 1 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [],
			submissions: [],
			aggregate: null,
			administrativeCompletion: null,
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: [],
			administrativeCompletion: null,
		},
		...overrides,
	});
}

describe("sales completion status-only fallback", () => {
	test("selects only failed or review-required Production outcomes", () => {
		const outcomes: BulkProductionCompletionOutcome[] = [
			{ salesId: 1, orderNo: "A", status: "succeeded" },
			{ salesId: 2, orderNo: "B", status: "already_completed" },
			{ salesId: 3, orderNo: "C", status: "awaiting_review" },
			{
				salesId: 4,
				orderNo: "D",
				status: "failed",
				error: "Missing operational evidence",
			},
		];

		expect(
			resolveSalesCompletionFallbackCandidates({
				milestone: "PRODUCTION_COMPLETED",
				outcomes,
			}),
		).toEqual([
			{
				salesOrderId: 3,
				orderNo: "C",
				fullWorkflowStatus: "awaiting_review",
				reason: "Production completion requires review.",
			},
			{
				salesOrderId: 4,
				orderNo: "D",
				fullWorkflowStatus: "failed",
				reason: "Missing operational evidence",
			},
		]);
	});

	test("selects only failed or review-required Fulfillment outcomes", () => {
		const outcomes: BulkFulfillmentOutcome[] = [
			{ salesId: 1, orderNo: "A", status: "succeeded" },
			{ salesId: 2, orderNo: "B", status: "already_fulfilled" },
			{
				salesId: 3,
				orderNo: "C",
				status: "review_required",
				error: "FULFILLMENT_PROOF_INCOMPLETE",
			},
			{ salesId: 4, status: "failed" },
		];

		expect(
			resolveSalesCompletionFallbackCandidates({
				milestone: "FULFILLMENT_COMPLETED",
				outcomes,
			}),
		).toEqual([
			{
				salesOrderId: 3,
				orderNo: "C",
				fullWorkflowStatus: "review_required",
				reason: "FULFILLMENT_PROOF_INCOMPLETE",
			},
			{
				salesOrderId: 4,
				orderNo: null,
				fullWorkflowStatus: "failed",
				reason: "Fulfillment completion failed.",
			},
		]);
	});

	test("returns no fallback candidates when full workflow succeeded or replayed", () => {
		expect(
			resolveSalesCompletionFallbackCandidates({
				milestone: "PRODUCTION_COMPLETED",
				outcomes: [
					{ salesId: 1, status: "succeeded" },
					{ salesId: 2, status: "already_completed" },
				],
			}),
		).toEqual([]);
	});

	test("retains every row when the full-workflow batch entirely failed", () => {
		expect(
			resolveSalesCompletionFallbackCandidates({
				milestone: "FULFILLMENT_COMPLETED",
				outcomes: [
					{ salesId: 1, status: "failed", error: "Dispatch missing" },
					{ salesId: 2, status: "review_required" },
				],
			}),
		).toHaveLength(2);
	});

	test("builds a deterministic per-sale immutable full-workflow outcome identity", () => {
		const input = {
			milestone: "PRODUCTION_COMPLETED" as const,
			requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			salesOrderId: 41,
		};
		const first = buildSalesCompletionFullWorkflowOutcomeHistoryId(input);
		expect(buildSalesCompletionFullWorkflowOutcomeHistoryId(input)).toBe(first);
		expect(first).toContain(input.requestId);
		expect(first).toContain(":41");
	});

	test("allows known current states and supported same-stage exceptions only", () => {
		expect(
			resolveSalesCompletionFallbackEligibility({
				milestone: "PRODUCTION_COMPLETED",
				pipeline: pipeline(),
			}),
		).toEqual({
			eligible: true,
			administrativeOverrideRequired: false,
			blockedReason: null,
		});

		const productionException = pipeline({
			production: {
				configuredRequirement: false,
				requiredQty: 1,
				assignments: [
					{
						id: 91,
						active: true,
						assignedQty: 1,
						completedQty: 0,
						completedAt: null,
					},
				],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
		});
		expect(
			resolveSalesCompletionFallbackEligibility({
				milestone: "PRODUCTION_COMPLETED",
				pipeline: productionException,
			}),
		).toEqual({
			eligible: true,
			administrativeOverrideRequired: true,
			blockedReason: null,
		});
		expect(
			resolveSalesCompletionFallbackEligibility({
				milestone: "FULFILLMENT_COMPLETED",
				pipeline: productionException,
			}),
		).toMatchObject({
			eligible: false,
			administrativeOverrideRequired: false,
		});
	});

	test("rejects status-only fallback after canonical completion", () => {
		const completed = pipeline({
			production: {
				configuredRequirement: true,
				requiredQty: 1,
				assignments: [
					{
						id: 91,
						active: true,
						assignedQty: 1,
						completedQty: 1,
						completedAt: "2026-09-07",
					},
				],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
		});
		expect(
			resolveSalesCompletionFallbackEligibility({
				milestone: "PRODUCTION_COMPLETED",
				pipeline: completed,
			}),
		).toMatchObject({
			eligible: false,
			administrativeOverrideRequired: false,
		});
	});

	test("permits omitted reasons but rejects forged direct fallback provenance", () => {
		const direct = {
			salesOrderId: 41,
			requestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
			expectedRevision: "0".repeat(64),
		};
		expect(
			markProductionCompletionStatusOnlySchema.safeParse(direct).success,
		).toBe(true);
		expect(
			markProductionCompletionStatusOnlySchema.safeParse({
				...direct,
				reason: "Work completed outside GND.",
			}).success,
		).toBe(true);
		expect(
			markProductionCompletionStatusOnlySchema.safeParse({
				...direct,
				reason: "Work completed outside GND.",
				fallback: {
					fallbackDecisionRequestId: "7bbfb356-aec8-474f-a779-368c566595d0",
					fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
					fullWorkflowStatus: "failed",
					fullWorkflowReason: "Forged client claim",
					expectedPipelineRevision: "1".repeat(64),
				},
			}).success,
		).toBe(false);

		const fallback = {
			milestone: "PRODUCTION_COMPLETED",
			fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			requestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
			reason: "",
			effectiveAt: null,
			candidates: [
				{
					salesOrderId: 41,
					expectedCompletionRevision: "0".repeat(64),
					expectedPipelineRevision: "1".repeat(64),
					administrativeOverrideRequired: false,
				},
			],
		};
		expect(
			markSalesCompletionStatusOnlyFallbackSchema.safeParse(fallback).success,
		).toBe(true);
		expect(
			markSalesCompletionStatusOnlyFallbackSchema.safeParse({
				...fallback,
				reason: "The physical work was verified outside GND.",
			}).success,
		).toBe(true);
	});

	test("persists one immutable, replay-safe outcome record per selected sale", async () => {
		const writes: Array<Record<string, unknown>> = [];
		const db = {
			salesHistory: {
				createMany: async (input: {
					data: Array<Record<string, unknown>>;
					skipDuplicates: boolean;
				}) => {
					writes.push(...input.data);
					expect(input.skipDuplicates).toBe(true);
				},
				findMany: async () =>
					writes.map((row) => ({ id: row.id, data: row.data })),
			},
		} as never;
		await recordSalesCompletionFullWorkflowOutcomes(db, {
			milestone: "PRODUCTION_COMPLETED",
			requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			actor: { id: 7, name: "Sales Rep" },
			outcomes: [
				{ salesId: 1, orderNo: "A", status: "succeeded" },
				{
					salesId: 2,
					orderNo: "B",
					status: "failed",
					error: "Workflow failed",
				},
			],
		});

		expect(writes).toHaveLength(2);
		expect(writes.map((row) => row.id)).toEqual([
			"sales-completion-full-workflow:PRODUCTION_COMPLETED:a818581e-6e44-43c6-a955-e2e68cc02314:1",
			"sales-completion-full-workflow:PRODUCTION_COMPLETED:a818581e-6e44-43c6-a955-e2e68cc02314:2",
		]);
		expect(writes[1]?.data).toMatchObject({
			event: "SALES_COMPLETION_FULL_WORKFLOW_OUTCOME",
			requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			salesOrderId: 2,
			status: "failed",
			error: "Workflow failed",
		});
	});

	test("fails closed when a persisted workflow outcome audit is malformed", async () => {
		const db = {
			salesHistory: {
				findMany: async () => [
					{
						id: "sales-completion-full-workflow:PRODUCTION_COMPLETED:a818581e-6e44-43c6-a955-e2e68cc02314:41",
						salesId: 41,
						data: {
							event: "SALES_COMPLETION_FULL_WORKFLOW_OUTCOME",
							requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
							milestone: "PRODUCTION_COMPLETED",
							salesOrderId: 42,
							orderNo: "ORDER-41",
							status: "failed",
							error: "Workflow failed",
							actorId: 7,
							commandFingerprint: "tampered",
						},
					},
				],
			},
		} as never;
		let error: unknown = null;
		try {
			await getSalesCompletionStatusOnlyFallbackPreview(db, {
				milestone: "PRODUCTION_COMPLETED",
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			});
		} catch (caught) {
			error = caught;
		}
		expect(error).toMatchObject({
			code: "PERSISTENCE_FAILURE",
			message: "A full-workflow outcome audit record is invalid.",
		});
	});

	test("validates mixed persisted outcomes before selecting only the failed subset", async () => {
		const writes: Array<Record<string, unknown>> = [];
		const writeDb = {
			salesHistory: {
				createMany: async (input: {
					data: Array<Record<string, unknown>>;
				}) => {
					writes.push(...input.data);
				},
				findMany: async () =>
					writes.map((row) => ({ id: row.id, data: row.data })),
			},
		} as never;
		await recordSalesCompletionFullWorkflowOutcomes(writeDb, {
			milestone: "PRODUCTION_COMPLETED",
			requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			actor: { id: 7, name: "Sales Rep" },
			outcomes: [
				{ salesId: 40, orderNo: "ORDER-40", status: "succeeded" },
				{
					salesId: 41,
					orderNo: "ORDER-41",
					status: "failed",
					error: "Workflow failed",
				},
			],
		});

		const preview = await getSalesCompletionStatusOnlyFallbackPreview(
			{
				salesHistory: {
					findMany: async () =>
						writes.map((row) => ({
							id: row.id,
							salesId: row.salesId,
							data: row.data,
						})),
				},
				salesOrders: { findFirst: async () => null },
			} as never,
			{
				milestone: "PRODUCTION_COMPLETED",
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			},
		);

		expect(preview.items).toHaveLength(1);
		expect(preview.items[0]).toMatchObject({
			salesOrderId: 41,
			fullWorkflowStatus: "failed",
		});
	});

	test("applies fallback only to the eligible failed subset and replays idempotently", async () => {
		let decision: unknown = null;
		const markInputs: Array<Record<string, unknown>> = [];
		const db = {
			salesHistory: {
				findUnique: async () => (decision ? { data: decision } : null),
				create: async ({ data }: { data: { data: unknown } }) => {
					decision = data.data;
					return data;
				},
			},
		} as never;
		let replay = false;
		const dependencies = {
			getPreview: async () => ({
				milestone: "PRODUCTION_COMPLETED" as const,
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				eligibleCount: 1,
				blockedCount: 0,
				items: [
					{
						historyId: "outcome-41",
						salesOrderId: 41,
						orderNo: "ORDER-41",
						fullWorkflowStatus: "failed" as const,
						reason: "Workflow failed",
						eligible: true,
						administrativeOverrideRequired: false,
						completionRevision: "0".repeat(64),
						pipelineRevision: "1".repeat(64),
						blockedReason: null,
					},
				],
			}),
			markProduction: async (_db: unknown, input: Record<string, unknown>) => {
				markInputs.push(input);
				return { idempotentReplay: replay };
			},
			markFulfillment: async () => {
				throw new Error("Fulfillment command must not run.");
			},
		} as never;
		const input = {
			milestone: "PRODUCTION_COMPLETED" as const,
			fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
			requestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
			reason: "Physical completion verified outside GND.",
			effectiveAt: null,
			candidates: [
				{
					salesOrderId: 41,
					expectedCompletionRevision: "0".repeat(64),
					expectedPipelineRevision: "1".repeat(64),
					administrativeOverrideRequired: false,
				},
				{
					salesOrderId: 42,
					expectedCompletionRevision: "0".repeat(64),
					expectedPipelineRevision: "1".repeat(64),
					administrativeOverrideRequired: false,
				},
			],
		};

		const first = await markSalesCompletionStatusOnlyFallback(
			db,
			input,
			{ id: 7, name: "Sales Rep" },
			{},
			dependencies,
		);
		expect(first).toMatchObject({
			completed: 1,
			replayed: 0,
			skipped: 1,
			failed: 0,
		});
		expect(markInputs).toHaveLength(1);
		expect(markInputs[0]).toMatchObject({
			salesOrderId: 41,
			reason: "Physical completion verified outside GND.",
			fallback: {
				fallbackDecisionRequestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				fullWorkflowStatus: "failed",
				fullWorkflowReason: "Workflow failed",
				expectedPipelineRevision: "1".repeat(64),
			},
		});

		replay = true;
		const second = await markSalesCompletionStatusOnlyFallback(
			db,
			input,
			{ id: 7, name: "Sales Rep" },
			{},
			dependencies,
		);
		expect(second).toMatchObject({ completed: 0, replayed: 1, skipped: 1 });
		expect(markInputs).toHaveLength(2);
	});

	test("fails stale fallback candidates before any status-only write", async () => {
		let decision: unknown = null;
		let marks = 0;
		const db = {
			salesHistory: {
				findUnique: async () => (decision ? { data: decision } : null),
				create: async ({ data }: { data: { data: unknown } }) => {
					decision = data.data;
					return data;
				},
			},
		} as never;
		const result = await markSalesCompletionStatusOnlyFallback(
			db,
			{
				milestone: "FULFILLMENT_COMPLETED",
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				requestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
				reason: "Verified outside GND.",
				effectiveAt: null,
				candidates: [
					{
						salesOrderId: 41,
						expectedCompletionRevision: "9".repeat(64),
						expectedPipelineRevision: "1".repeat(64),
						administrativeOverrideRequired: false,
					},
				],
			},
			{ id: 7, name: "Sales Rep" },
			{},
			{
				getPreview: async () => ({
					milestone: "FULFILLMENT_COMPLETED",
					fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
					eligibleCount: 1,
					blockedCount: 0,
					items: [
						{
							historyId: "outcome-41",
							salesOrderId: 41,
							orderNo: "ORDER-41",
							fullWorkflowStatus: "review_required",
							reason: "Proof incomplete",
							eligible: true,
							administrativeOverrideRequired: false,
							completionRevision: "0".repeat(64),
							pipelineRevision: "1".repeat(64),
							blockedReason: null,
						},
					],
				}),
				markProduction: async () => {
					marks += 1;
					return {};
				},
				markFulfillment: async () => {
					marks += 1;
					return {};
				},
			} as never,
		);
		expect(result.items).toEqual([
			{
				salesOrderId: 41,
				status: "failed",
				code: "STALE_STATE",
				message:
					"The order changed after the fallback confirmation opened. Refresh and try again.",
			},
		]);
		expect(marks).toBe(0);
	});

	test("recovers an identical concurrent fallback decision identity", async () => {
		let decision: unknown = null;
		let findCount = 0;
		const db = {
			salesHistory: {
				findUnique: async () => {
					findCount += 1;
					return findCount === 1 || !decision ? null : { data: decision };
				},
				create: async ({ data }: { data: { data: unknown } }) => {
					decision = data.data;
					throw Object.assign(new Error("duplicate"), { code: "P2002" });
				},
			},
		} as never;
		const result = await markSalesCompletionStatusOnlyFallback(
			db,
			{
				milestone: "PRODUCTION_COMPLETED",
				fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				requestId: "cfa0d052-c674-4cc2-9755-229d87d8b1d8",
				reason: "Verified outside GND.",
				effectiveAt: null,
				candidates: [
					{
						salesOrderId: 41,
						expectedCompletionRevision: "0".repeat(64),
						expectedPipelineRevision: "1".repeat(64),
						administrativeOverrideRequired: false,
					},
				],
			},
			{ id: 7, name: "Sales Rep" },
			{},
			{
				getPreview: async () => ({
					milestone: "PRODUCTION_COMPLETED",
					fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
					eligibleCount: 1,
					blockedCount: 0,
					items: [
						{
							historyId: "outcome-41",
							salesOrderId: 41,
							orderNo: "ORDER-41",
							fullWorkflowStatus: "failed",
							reason: "Workflow failed",
							eligible: true,
							administrativeOverrideRequired: false,
							completionRevision: "0".repeat(64),
							pipelineRevision: "1".repeat(64),
							blockedReason: null,
						},
					],
				}),
				markProduction: async () => ({ idempotentReplay: false }),
				markFulfillment: async () => ({ idempotentReplay: false }),
			} as never,
		);
		expect(result).toMatchObject({ completed: 1, failed: 0, skipped: 0 });
		expect(findCount).toBe(2);
	});
});
