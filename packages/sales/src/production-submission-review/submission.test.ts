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
				laborCost: 25,
				salesItemControlUid: "door-1",
				qtyAssigned: 1,
				lhQty: 0,
				rhQty: 1,
				submissions: [],
				...overrides,
			})),
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
		).rejects.toThrow("assigned to you");
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

	it("rejects zero quantity before material classification", async () => {
		await expect(
			submitProductionAssignmentInTransaction(
				dbWithAssignment() as never,
				input({ qty: 0, rhQty: 0 }),
			),
		).rejects.toThrow("must be greater than zero");
	});
});
