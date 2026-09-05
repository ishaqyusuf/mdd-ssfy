import { describe, expect, it } from "bun:test";

import { resolveSalesPipelineSnapshot } from "../sales-pipeline";
import type { Db } from "../types";
import { decideProductionSubmissionMaterialReview } from "./decision";
import {
	countActionableProductionSubmissionMaterialReviews,
	getActionablePendingReviewIds,
	getProductionSubmissionMaterialReviewDetail,
} from "./queries";
import { buildProductionMaterialReviewRepairPlan } from "./reconciliation";
import type { ProductionSubmissionMaterialEvidence } from "./service";

function pipeline(salesOrderId: number, terminal = false) {
	return resolveSalesPipelineSnapshot({
		salesOrderId,
		orderNo: `SO-${salesOrderId}`,
		commercial: { status: terminal ? "cancelled" : "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required" },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [],
			submissions: [],
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: [],
		},
		evidenceUpdatedAt: "2026-09-02T00:00:00.000Z",
	});
}

describe("production material-review query membership", () => {
	it.each([
		["2026-08-21T19:04:44.000Z", true],
		["2026-08-21T19:04:45.000Z", false],
		["2026-08-21T19:04:45.347Z", false],
		[null, false],
	] as const)(
		"matches read and decision assignment safety at %s",
		async (revision, safe) => {
			const review = {
				id: 147,
				salesOrderId: 26003,
				submittedById: 44,
				status: "PENDING",
				updatedAt: new Date("2026-08-21T19:04:45.000Z"),
				assignmentScope: [
					{
						controlUid: "door-64287",
						salesItemId: 170760,
						assignmentId: 12910,
					},
				],
				submissions: [
					{
						id: 12754,
						assignmentId: 12910,
						salesOrderItemId: 170760,
						salesOrderId: 26003,
						materialReviewId: 147,
						submittedById: 44,
						qty: 1,
						lhQty: 0,
						rhQty: 0,
						createdAt: new Date("2026-08-21T19:04:45.000Z"),
						deletedAt: null,
						meta: { internalCostNote: "Not a public submission field" },
						assignment: {
							id: 12910,
							orderId: 26003,
							itemId: 170760,
							assignedToId: 44,
							laborCost: 10,
							salesItemControlUid: "door-64287",
							qtyAssigned: 1,
							lhQty: 0,
							rhQty: 0,
							deletedAt: null,
							updatedAt: revision ? new Date(revision) : null,
						},
					},
				],
			};
			const db = {
				salesProductionSubmissionMaterialReview: {
					findMany: async () => [review],
					findUniqueOrThrow: async ({
						include,
					}: {
						include: { submissions: { where?: { deletedAt: null } } };
					}) =>
						include.submissions.where
							? review
							: {
									...review,
									submissions: [
										...review.submissions,
										{
											...review.submissions[0],
											id: 12755,
											deletedAt: new Date("2026-08-22T00:00:00.000Z"),
										},
									],
								},
					updateMany: async () => ({ count: 1 }),
				},
				salesHistory: { create: async () => ({}) },
				salesItemControl: { findMany: async () => [] },
			};
			const dependencies = {
				getSnapshots: async () => new Map([[26003, pipeline(26003)]]),
				evaluateEvidence: async () =>
					({
						itemMaterialStatuses: [{ code: "material_ready" }],
						materialSnapshot: [],
						materialRevision: "ready-materials",
						classification: { state: "finalized", reason: null },
					}) as never,
				isSuperseded: async () => false,
			};
			const reads = await getActionablePendingReviewIds(
				db as never,
				{},
				dependencies,
			);
			const current = reads.get(147);
			if (!current)
				throw new Error("Review must remain visible for assessment");
			expect(current.actionability).toMatchObject({
				classification: safe ? "ready_to_converge" : "ambiguous",
				actionable: true,
				supportedRepair: safe ? "approve_ready" : null,
			});
			const detail = await getProductionSubmissionMaterialReviewDetail(
				db as never,
				147,
				dependencies,
			);
			expect(detail.actionability).toEqual(current.actionability);
			expect(detail.submissions).toHaveLength(1);
			expect(detail.retractedSubmissions).toHaveLength(1);
			for (const submission of [
				...detail.submissions,
				...detail.retractedSubmissions,
			]) {
				expect(Object.keys(submission).sort()).toEqual([
					"assignmentId",
					"createdAt",
					"deletedAt",
					"id",
					"lhQty",
					"qty",
					"rhQty",
					"salesOrderItemId",
				]);
			}
			expect(
				buildProductionMaterialReviewRepairPlan({
					actionability: current.actionability,
					materialStatus: current.materialStatus,
					storedReason: "AWAITING_INBOUND",
				}).operation,
			).toBe(safe ? "approve_ready" : "none");
			let approvals = 0;
			const result = await decideProductionSubmissionMaterialReview(
				{
					$transaction: async (execute: (tx: typeof db) => Promise<unknown>) =>
						execute(db),
				} as never,
				{
					reviewId: 147,
					expectedUpdatedAt: review.updatedAt,
					action: "RECHECK_AND_APPROVE",
					note: "Verify assignment provenance",
				},
				{ id: 1, name: "Reviewer" },
				{
					resetSales: async () => ({}) as never,
					evaluateEvidence: dependencies.evaluateEvidence,
					repairReceivedInboundNeeds: async () =>
						({ inboundIds: [], changedCount: 0 }) as never,
					recordFullWorkflowCompletion: async () =>
						({ recorded: true }) as never,
					onApproved: async () => {
						approvals += 1;
					},
				},
			);
			expect(result.status).toBe(safe ? "APPROVED" : "CANCELLED");
			expect(approvals).toBe(safe ? 1 : 0);
		},
	);
	it("uses current evidence to exclude terminal, superseded, and empty pending reviews", async () => {
		const candidates = [
			{
				id: 1,
				salesOrderId: 101,
				status: "PENDING",
				submissions: [{ id: 11 }],
			},
			{
				id: 2,
				salesOrderId: 102,
				status: "PENDING",
				submissions: [{ id: 12 }],
			},
			{
				id: 3,
				salesOrderId: 103,
				status: "PENDING",
				submissions: [{ id: 13 }],
			},
			{ id: 4, salesOrderId: 104, status: "PENDING", submissions: [] },
		].map((candidate) => ({
			...candidate,
			assignmentScope: [
				{
					controlUid: `control-${candidate.id}`,
					salesItemId: candidate.id,
					assignmentId: candidate.id,
				},
			],
		}));
		const findManyInputs: unknown[] = [];
		const db = {
			salesProductionSubmissionMaterialReview: {
				findMany: async (input: unknown) => {
					findManyInputs.push(input);
					return candidates;
				},
			},
		} as unknown as Db;

		const result = await getActionablePendingReviewIds(
			db,
			{},
			{
				getSnapshots: async () =>
					new Map([
						[101, pipeline(101)],
						[102, pipeline(102, true)],
						[103, pipeline(103)],
						[104, pipeline(104)],
					]),
				evaluateEvidence: async (_db, input) =>
					({
						itemMaterialStatuses: [
							{
								code:
									input.salesOrderId === 101
										? "material_shortage"
										: "setup_needed",
							},
						],
					}) as unknown as ProductionSubmissionMaterialEvidence,
				isSuperseded: async (_db, review) => review.id === 3,
			},
		);

		expect([...result.keys()]).toEqual([1]);
		expect(findManyInputs).toHaveLength(1);
		expect(findManyInputs[0]).toMatchObject({
			where: {
				status: "PENDING",
				submissions: { some: { deletedAt: null } },
			},
		});
	});

	it("uses the same current-evidence predicate for summary counts", async () => {
		const db = {
			salesProductionSubmissionMaterialReview: {
				findMany: async () => [
					{
						id: 1,
						salesOrderId: 101,
						status: "PENDING",
						assignmentScope: [],
						submissions: [{ id: 11 }],
					},
				],
			},
		} as unknown as Db;
		const total = await countActionableProductionSubmissionMaterialReviews(
			db,
			{},
			{
				getSnapshots: async () => new Map([[101, pipeline(101)]]),
				evaluateEvidence: async () =>
					({
						itemMaterialStatuses: [{ code: "material_shortage" }],
					}) as unknown as ProductionSubmissionMaterialEvidence,
				isSuperseded: async () => false,
			},
		);

		expect(total).toBe(1);
	});
});
