import { describe, expect, it, mock } from "bun:test";

import {
	createPendingMaterialReview,
	prepareProductionSubmissionMaterialReview,
} from "./service";

type ReviewUpsertArgs = {
	create: {
		salesOrderId: number;
		submittedById: number;
		assignmentScope: unknown[];
		status: "PENDING" | "APPROVED";
		classificationReason: string | null;
		materialRevision: string | null;
	};
};

describe("production submission material review service", () => {
	it("auto-approves ready submissions while retaining an idempotent batch", async () => {
		const upsert = mock(async ({ create }: ReviewUpsertArgs) => ({
			id: 88,
			salesOrderId: create.salesOrderId,
			submittedById: create.submittedById,
			assignmentScope: create.assignmentScope,
			status: create.status,
			classificationReason: create.classificationReason,
			materialRevision: create.materialRevision,
		}));
		const result = await prepareProductionSubmissionMaterialReview(
			{
				salesProductionSubmissionMaterialReview: { upsert },
			} as never,
			{
				salesOrderId: 42,
				submittedById: 7,
				idempotencyKey: "ready-42",
				itemScope: [{ controlUid: "door-1", salesItemId: 10 }],
			},
			{
				loadMaterials: mock(async () => ({
					state: "available" as const,
					materials: [
						{
							salesItemId: 10,
							readiness: "ready_for_production",
						},
					],
				})) as never,
			},
		);

		expect(result).toEqual({
			state: "finalized",
			reason: null,
			reviewId: 88,
			materialRevision: expect.any(String),
		});
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					status: "APPROVED",
					classificationReason: null,
				}),
			}),
		);
	});

	it("persists one pending review with bounded scoped evidence", async () => {
		const upsert = mock(async ({ create }: ReviewUpsertArgs) => ({
			id: 91,
			salesOrderId: create.salesOrderId,
			submittedById: create.submittedById,
			assignmentScope: create.assignmentScope,
			status: create.status,
			classificationReason: create.classificationReason,
			materialRevision: create.materialRevision,
		}));
		const db = {
			salesProductionSubmissionMaterialReview: {
				upsert,
			},
		};

		const result = await prepareProductionSubmissionMaterialReview(
			db as never,
			{
				salesOrderId: 42,
				submittedById: 7,
				idempotencyKey: "pending-42",
				itemScope: [{ controlUid: "door-1", salesItemId: 10 }],
			},
			{
				loadMaterials: mock(async () => ({
					state: "available" as const,
					materials: [
						{
							salesOrderId: 42,
							salesItemId: 10,
							componentId: 100,
							name: "Oak",
							readiness: "awaiting_inbound",
							stockStatus: "inbound_pending",
							requiredQty: 2,
							availableQty: 0,
							openInboundQty: 2,
							expectedAt: new Date("2026-07-31T09:00:00.000Z"),
							undatedOpenInboundQty: 0,
						},
						{
							salesOrderId: 42,
							salesItemId: 999,
							componentId: 101,
							name: "Unrelated",
							readiness: "blocked",
						},
					],
				})) as never,
			},
		);

		expect(result).toEqual({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
			reviewId: 91,
			materialRevision: expect.any(String),
		});
		expect(upsert).toHaveBeenCalledWith({
			where: { idempotencyKey: "pending-42" },
			create: expect.objectContaining({
				salesOrderId: 42,
				submittedById: 7,
				status: "PENDING",
				classificationReason: "AWAITING_INBOUND",
				idempotencyKey: "pending-42",
				assignmentScope: [
					{
						controlUid: "door-1",
						salesItemId: 10,
						assignmentId: null,
						assignedToId: null,
						assignmentUpdatedAt: null,
						laborCost: null,
					},
				],
				materialSnapshot: [
					expect.objectContaining({
						salesItemId: 10,
						componentId: 100,
						expectedAt: "2026-07-31T09:00:00.000Z",
					}),
				],
			}),
			update: {},
			select: {
				id: true,
				salesOrderId: true,
				submittedById: true,
				assignmentScope: true,
				status: true,
				classificationReason: true,
				materialRevision: true,
			},
		});
	});

	for (const scenario of [
		{
			name: "awaiting inbound",
			state: "available" as const,
			readiness: "awaiting_inbound",
			reason: "AWAITING_INBOUND",
		},
		{
			name: "awaiting allocation",
			state: "available" as const,
			readiness: "allocation_review",
			reason: "ALLOCATION_REVIEW",
		},
		{
			name: "configured unavailable",
			state: "available" as const,
			readiness: "blocked",
			reason: "BLOCKED",
		},
		{
			name: "temporarily unavailable",
			state: "unavailable" as const,
			readiness: null,
			reason: "PROJECTION_UNAVAILABLE",
		},
	] as const) {
		it(`routes ${scenario.name} worker evidence to durable review`, async () => {
			const upsert = mock(async ({ create }: ReviewUpsertArgs) => ({
				id: 93,
				salesOrderId: create.salesOrderId,
				submittedById: create.submittedById,
				assignmentScope: create.assignmentScope,
				status: create.status,
				classificationReason: create.classificationReason,
				materialRevision: create.materialRevision,
			}));
			const result = await prepareProductionSubmissionMaterialReview(
				{
					salesProductionSubmissionMaterialReview: { upsert },
				} as never,
				{
					salesOrderId: 42,
					submittedById: 7,
					idempotencyKey: "worker-blocked-42",
					itemScope: [{ controlUid: "door-1", salesItemId: 10 }],
				},
				{
					loadMaterials: mock(async () => ({
						state: scenario.state,
						materials: scenario.readiness
							? [{ salesItemId: 10, readiness: scenario.readiness }]
							: [],
					})) as never,
				},
			);

			expect(result).toMatchObject({
				state: "pending_material_review",
				reason: scenario.reason,
				reviewId: 93,
			});
			expect(upsert).toHaveBeenCalledTimes(1);
		});
	}

	it("holds a mixed scope when any scoped item has no material configuration", async () => {
		const upsert = mock(async ({ create }: ReviewUpsertArgs) => ({
			id: 92,
			salesOrderId: create.salesOrderId,
			submittedById: create.submittedById,
			assignmentScope: create.assignmentScope,
			status: create.status,
			classificationReason: create.classificationReason,
			materialRevision: create.materialRevision,
		}));
		const result = await prepareProductionSubmissionMaterialReview(
			{
				salesProductionSubmissionMaterialReview: { upsert },
			} as never,
			{
				salesOrderId: 42,
				submittedById: 7,
				idempotencyKey: "mixed-42",
				itemScope: [
					{ controlUid: "door-1", salesItemId: 10 },
					{ controlUid: "door-2", salesItemId: 11 },
				],
			},
			{
				loadMaterials: mock(async () => ({
					state: "available" as const,
					materials: [
						{
							salesOrderId: 42,
							salesItemId: 10,
							componentId: 100,
							name: "Oak",
							readiness: "ready_for_production",
						},
					],
				})) as never,
			},
		);

		expect(result).toMatchObject({
			state: "pending_material_review",
			reason: "NOT_CONFIGURED",
			reviewId: 92,
		});
		expect(upsert.mock.calls[0]?.[0].create.materialSnapshot).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					salesItemId: 11,
					readiness: "not_configured",
				}),
			]),
		);
	});
});

describe("createPendingMaterialReview", () => {
	it("returns the existing batch for an idempotent retry", async () => {
		const upsert = mock(async () => ({
			id: 44,
			salesOrderId: 42,
			submittedById: 7,
			assignmentScope: [],
			status: "PENDING" as const,
			classificationReason: "NOT_CONFIGURED" as const,
			materialRevision: null,
		}));
		const db = {
			salesProductionSubmissionMaterialReview: {
				upsert,
			},
		};

		const result = await createPendingMaterialReview(db as never, {
			salesOrderId: 42,
			submittedById: 7,
			idempotencyKey: "retry-42",
			itemScope: [],
			materialSnapshot: [],
			materialRevision: null,
			reason: "NOT_CONFIGURED",
		});

		expect(result.id).toBe(44);
	});

	it("rejects reuse of an idempotency key for another assignment scope", async () => {
		const db = {
			salesProductionSubmissionMaterialReview: {
				upsert: mock(async () => ({
					id: 44,
					salesOrderId: 42,
					submittedById: 7,
					assignmentScope: [
						{ controlUid: "door-2", salesItemId: 11, assignmentId: 78 },
					],
					status: "PENDING" as const,
					classificationReason: "NOT_CONFIGURED" as const,
					materialRevision: null,
				})),
			},
		};

		await expect(
			createPendingMaterialReview(db as never, {
				salesOrderId: 42,
				submittedById: 7,
				idempotencyKey: "retry-42",
				itemScope: [
					{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
				],
				materialSnapshot: [],
				materialRevision: null,
				reason: "NOT_CONFIGURED",
			}),
		).rejects.toThrow("belongs to another request");
	});
});
