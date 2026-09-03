import { describe, expect, it } from "bun:test";

import { salesProductionSubmissionMaterialReview } from "../src/types/sales-production-submission-material-review";
import { salesProductionSubmitted } from "../src/types/sales-production-submitted";
import { salesProductionUnassigned } from "../src/types/sales-production-unassigned";

const author = { id: 1, profileId: 1, name: "Sales rep" };
const recipient = { id: 2, profileId: 54, name: "Carlos" };

describe("production lifecycle notifications", () => {
	it("tells the worker which assignment was removed", () => {
		const activity = salesProductionUnassigned.createActivity(
			{
				salesId: 26595,
				orderNo: "09480AD",
				assignmentId: 14290,
				assignedToId: 54,
			},
			author,
			recipient,
		);
		expect(activity.type).toBe("sales_production_unassigned");
		expect(activity.headline).toContain("09480AD");
		expect(activity.headline).toContain("unassigned");
	});

	it("tells the sales rep who submitted production work", () => {
		const activity = salesProductionSubmitted.createActivity(
			{
				salesId: 26595,
				orderNo: "09480AD",
				salesRepId: 16,
				submittedById: 54,
				submittedByName: "Carlos",
				submittedQty: 2,
			},
			author,
			recipient,
		);
		expect(activity.type).toBe("sales_production_submitted");
		expect(activity.headline).toContain("Carlos");
		expect(activity.headline).toContain("09480AD");
	});

	it("preserves actionable material classification and evidence provenance", () => {
		const data = {
			reviewId: 91,
			salesId: 26595,
			orderNo: "09480AD",
			workerId: 54,
			workerName: "Carlos",
			submittedQty: 2,
			reason: "AWAITING_INBOUND",
			pendingMaterialCount: 1,
			expectedAt: "2026-09-05",
			classification: "actionable_unresolved" as const,
			classificationVersion: "production-material-review/v1",
			evidenceRevision: "material-revision-91",
		};
		const parsed = salesProductionSubmissionMaterialReview.schema.parse(data);
		const activity = salesProductionSubmissionMaterialReview.createActivity(
			parsed,
			author,
			recipient,
		);

		expect(activity.note).toContain("Status: actionable unresolved");
		expect(activity.tags.classificationVersion).toBe(
			"production-material-review/v1",
		);
		expect(activity.tags.evidenceRevision).toBe("material-revision-91");
	});
});
