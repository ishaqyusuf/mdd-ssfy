import { describe, expect, it } from "bun:test";

import { resolveSalesPipelineSnapshot } from "../sales-pipeline";
import type { Db } from "../types";
import {
	countActionableProductionSubmissionMaterialReviews,
	getActionablePendingReviewIds,
} from "./queries";
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
