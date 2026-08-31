import { describe, expect, it, mock } from "bun:test";

import { reconcileMaterialReviewsAfterSubmissionRetraction } from "./retraction";

describe("production submission material review retraction", () => {
	it("keeps a pending material review actionable after its final submission is retracted", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const historyCreate = mock(async () => ({}));
		const db = {
			salesProductionSubmissionMaterialReview: {
				findUnique: mock(async () => ({
					id: 55,
					salesOrderId: 42,
					status: "PENDING",
					assignmentScope: [
						{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
					],
					submissions: [],
				})),
				updateMany,
			},
			salesHistory: { create: historyCreate },
		};

		const result = await reconcileMaterialReviewsAfterSubmissionRetraction(
			db as never,
			{
				salesOrderId: 42,
				retractedSubmissions: [
					{ id: 91, assignmentId: 77, materialReviewId: 55 },
				],
				actor: { id: 7, name: "Carlos" },
			},
		);

		expect(result.refreshedReviewIds).toEqual([55]);
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 55, status: "PENDING" },
				data: expect.objectContaining({
					resolution: expect.objectContaining({
						action: "SUBMISSION_RETRACTED",
					}),
				}),
			}),
		);
		expect(historyCreate).toHaveBeenCalled();
	});

	it("keeps a shared pending review open and removes only the retracted assignment scope", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const db = {
			salesProductionSubmissionMaterialReview: {
				findUnique: mock(async () => ({
					id: 55,
					salesOrderId: 42,
					status: "PENDING",
					assignmentScope: [
						{ controlUid: "door-1", salesItemId: 10, assignmentId: 77 },
						{ controlUid: "door-2", salesItemId: 11, assignmentId: 78 },
					],
					submissions: [{ id: 92, assignmentId: 78 }],
				})),
				updateMany,
			},
			salesHistory: { create: mock(async () => ({})) },
		};

		const result = await reconcileMaterialReviewsAfterSubmissionRetraction(
			db as never,
			{
				salesOrderId: 42,
				retractedSubmissions: [
					{ id: 91, assignmentId: 77, materialReviewId: 55 },
				],
				actor: { id: 7, name: "Carlos" },
			},
		);

		expect(result.refreshedReviewIds).toEqual([55]);
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 55, status: "PENDING" },
				data: {
					assignmentScope: [
						expect.objectContaining({
							controlUid: "door-2",
							salesItemId: 11,
							assignmentId: 78,
						}),
					],
				},
			}),
		);
	});
});
