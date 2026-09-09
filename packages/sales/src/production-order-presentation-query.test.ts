import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { getProductionOrderPresentations } from "./production-order-presentation-query";
import {
	resolveSalesPipelineSnapshot,
	type SalesPipelineEvidence,
} from "./sales-pipeline";

test("loaded orders receive their own pending material reasons in a single query", async () => {
	const evidence: SalesPipelineEvidence = {
		salesOrderId: 1,
		orderNo: "A",
		evidenceUpdatedAt: "2026-09-08",
		commercial: { status: "open" },
		payment: { total: 0, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 1 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [],
			submissions: [
				{ id: 41, active: true, quantity: 1, reviewStatus: "PENDING" },
			],
			aggregate: null,
			administrativeCompletion: null,
		},
		fulfillment: {
			configuredRequirement: false,
			requiredQty: 0,
			packedQty: 0,
			dispatches: [],
			administrativeCompletion: null,
		},
	};
	let calls = 0;
	const db = {
		salesProductionSubmissionMaterialReview: {
			findMany: async (query: unknown) => {
				calls++;
				expect(query).toEqual({
					where: {
						salesOrderId: { in: [1, 2] },
						status: "PENDING",
						submissions: { some: { id: { in: [41, 42] }, deletedAt: null } },
					},
					select: { salesOrderId: true, classificationReason: true },
				});
				return [
					{ salesOrderId: 1, classificationReason: "ALLOCATION_REVIEW" },
					{ salesOrderId: 2, classificationReason: "AWAITING_INBOUND" },
				];
			},
		},
	} as unknown as Db;
	const second = {
		...evidence,
		salesOrderId: 2,
		production: {
			...evidence.production,
			submissions: [
				{ id: 42, active: true, quantity: 1, reviewStatus: "PENDING" },
			],
		},
	};
	const result = await getProductionOrderPresentations(
		db,
		new Map([
			[1, resolveSalesPipelineSnapshot(evidence)],
			[2, resolveSalesPipelineSnapshot(second)],
		]),
	);
	expect(calls).toBe(1);
	expect(result.get(1)?.attention.map((reason) => reason.code)).toEqual([
		"allocation_review",
	]);
	expect(result.get(2)?.attention.map((reason) => reason.code)).toEqual([
		"awaiting_inbound",
	]);
	expect(result.get(1)?.primary.label).toBe("Production completed");
});

test("an empty workspace needs no review lookup", async () => {
	const result = await getProductionOrderPresentations({} as Db, new Map());
	expect(result.size).toBe(0);
});
