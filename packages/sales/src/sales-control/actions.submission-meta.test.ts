import { describe, expect, it, mock } from "bun:test";
import { createSalesAssignmentSubmissionAction } from "./actions";

describe("production submission metadata", () => {
	it("persists the automatic completion source on created submissions", async () => {
		const createMany = mock(async () => ({ count: 1 }));
		const db = {
			orderProductionSubmissions: {
				createMany,
			},
		};

		await createSalesAssignmentSubmissionAction(db as never, {
			authorId: 7,
			salesId: 42,
			submissionMeta: { source: "sales_mark_as_completed" },
			items: [
				{
					assignmentId: 9,
					itemInfo: { itemId: 10 } as never,
					qty: { lh: 0, qty: 1, rh: 0 },
				},
			],
		});

		expect(createMany).toHaveBeenCalledWith({
			data: [
				{
					assignmentId: 9,
					lhQty: 0,
					meta: { source: "sales_mark_as_completed" },
					qty: 1,
					rhQty: 0,
					salesOrderId: 42,
					salesOrderItemId: 10,
					submittedById: 7,
				},
			],
		});
	});
});
