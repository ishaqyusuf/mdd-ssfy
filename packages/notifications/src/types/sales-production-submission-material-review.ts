import type { NotificationHandler } from "../base";
import {
	type SalesProductionSubmissionMaterialReviewInput,
	type SalesProductionSubmissionMaterialReviewTags,
	salesProductionSubmissionMaterialReviewSchema,
} from "../schemas";

export const salesProductionSubmissionMaterialReview: NotificationHandler = {
	schema: salesProductionSubmissionMaterialReviewSchema,
	createActivity(data: SalesProductionSubmissionMaterialReviewInput, author) {
		const payload: SalesProductionSubmissionMaterialReviewTags = {
			type: "sales_production_submission_material_review",
			source: "user",
			priority: 2,
			...data,
		};
		return {
			type: "sales_production_submission_material_review",
			source: "user",
			subject: "Production submission needs material review",
			headline: `Order ${data.orderNo || "-"} was submitted and needs material verification.`,
			note: [
				data.workerName ? `Worker: ${data.workerName}` : null,
				`Qty: ${data.submittedQty}`,
				`Status: ${data.classification.replaceAll("_", " ").toLowerCase()}`,
			]
				.filter(Boolean)
				.join(" | "),
			authorId: author.id,
			tags: payload,
		};
	},
};
