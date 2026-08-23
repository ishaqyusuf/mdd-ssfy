import { describe, expect, it, mock } from "bun:test";

import { submitProductionAssignmentInTransaction } from "./submission";

function input(overrides: Record<string, unknown> = {}) {
	return {
		salesOrderId: 42,
		salesOrderItemId: 10,
		assignmentId: 77,
		submittedById: 7,
		idempotencyKey: "submit-42-77",
		qty: 1,
		lhQty: 0,
		rhQty: 1,
		...overrides,
	};
}

function dbWithAssignment(overrides: Record<string, unknown> = {}) {
	return {
		orderItemProductionAssignments: {
			findUniqueOrThrow: mock(async () => ({
				id: 77,
				orderId: 42,
				itemId: 10,
				assignedToId: 7,
				deletedAt: null,
				laborCost: 25,
				salesItemControlUid: "door-1",
				qtyAssigned: 1,
				lhQty: 0,
				rhQty: 1,
				updatedAt: new Date("2026-08-23T12:00:00.000Z"),
				submissions: [],
				...overrides,
			})),
		},
		salesProductionSubmissionMaterialReview: {
			findUnique: mock(async () => null),
		},
	};
}

describe("submitProductionAssignmentInTransaction", () => {
	it("does not let a worker submit an unassigned job", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment({ assignedToId: null }) as never,
				input(),
			),
		).rejects.toThrow("active assigned worker");
	});

	it("allows an authorized supervisor to submit for the assigned worker", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment({ assignedToId: 99 }) as never,
				input({ allowSubmitForOthers: true }),
			),
		).rejects.not.toThrow("assigned to you");
	});

	it("does not trust a quantity larger than the remaining assignment", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment({
					submissions: [
						{
							qty: 1,
							lhQty: 0,
							rhQty: 1,
							deletedAt: null,
							materialReview: { status: "PENDING" },
						},
					],
				}) as never,
				input(),
			),
		).rejects.toThrow("exceeds the remaining assignment quantity");
	});

	it("does not accept a submission for a deleted assignment", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment({
					deletedAt: new Date("2026-08-23T12:00:00.000Z"),
				}) as never,
				input(),
			),
		).rejects.toThrow("no longer active");
	});

	it("returns an existing pending review before rechecking consumed quantity", async () => {
		const db = dbWithAssignment({
			submissions: [
				{
					qty: 1,
					lhQty: 0,
					rhQty: 1,
					deletedAt: null,
					materialReview: { status: "PENDING" },
				},
			],
		});
		db.salesProductionSubmissionMaterialReview.findUnique = mock(async () => ({
			id: 91,
			salesOrderId: 42,
			submittedById: 7,
			status: "PENDING",
			assignmentScope: [
				{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
			],
			materialRevision: "revision-1",
			submissions: [{
				id: 123,
				salesOrderId: 42,
				salesOrderItemId: 10,
				assignmentId: 77,
				submittedById: 7,
				qty: 1,
				lhQty: 0,
				rhQty: 1,
			}],
		})) as never;

		await expect(
			submitProductionAssignmentInTransaction(db as never, input()),
		).resolves.toEqual({
			submissionId: 123,
			state: "pending_material_review",
			reviewId: 91,
			idempotentReplay: true,
		});
	});

	it("replays an approved request after its assignment was deleted or reassigned", async () => {
		const db = dbWithAssignment({
			assignedToId: 99,
			deletedAt: new Date("2026-08-23T13:00:00.000Z"),
		});
		db.salesProductionSubmissionMaterialReview.findUnique = mock(async () => ({
			id: 91,
			salesOrderId: 42,
			submittedById: 7,
			status: "APPROVED",
			assignmentScope: [
				{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
			],
			submissions: [{
				id: 123,
				salesOrderId: 42,
				salesOrderItemId: 10,
				assignmentId: 77,
				submittedById: 7,
				qty: 1,
				lhQty: 0,
				rhQty: 1,
			}],
		})) as never;

		await expect(
			submitProductionAssignmentInTransaction(db as never, input()),
		).resolves.toEqual({
			submissionId: 123,
			state: "finalized",
			reviewId: 91,
			idempotentReplay: true,
		});
		expect(db.orderItemProductionAssignments.findUniqueOrThrow).not.toHaveBeenCalled();
	});

	it("rejects an idempotency key reused for another worker", async () => {
		const db = dbWithAssignment();
		db.salesProductionSubmissionMaterialReview.findUnique = mock(async () => ({
			id: 91,
			salesOrderId: 42,
			submittedById: 99,
			status: "PENDING",
			assignmentScope: [
				{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
			],
			materialRevision: "revision-1",
			submissions: [{ id: 123 }],
		})) as never;

		await expect(
			submitProductionAssignmentInTransaction(db as never, input()),
		).rejects.toThrow("belongs to another request");
	});

	it("rejects zero quantity before material classification", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment() as never,
				input({ qty: 0, rhQty: 0 }),
			),
		).rejects.toThrow("must be greater than zero");
	});
});
