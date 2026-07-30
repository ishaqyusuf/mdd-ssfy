import type { NotificationHandler } from "../base";
import {
	type SalesProductionSubmissionMaterialDecisionInput,
	type SalesProductionSubmissionMaterialDecisionTags,
	salesProductionSubmissionMaterialDecisionSchema,
} from "../schemas";

function decisionHandler(
	channel:
		| "sales_production_submission_material_approved"
		| "sales_production_submission_material_rejected",
): NotificationHandler {
	return {
		schema: salesProductionSubmissionMaterialDecisionSchema,
		createActivity(
			data: SalesProductionSubmissionMaterialDecisionInput,
			author,
		) {
			const payload: SalesProductionSubmissionMaterialDecisionTags = {
				type: channel,
				source: "user",
				priority: data.status === "APPROVED" ? 5 : 7,
				...data,
			};
			return {
				type: channel,
				source: "user",
				subject: `Production material review ${data.status.toLowerCase()}`,
				headline: `Order ${data.orderNo || "-"} production submission was ${data.status.toLowerCase()}.`,
				note: data.note || undefined,
				authorId: author.id,
				tags: payload,
			};
		},
	};
}

export const salesProductionSubmissionMaterialApproved = decisionHandler(
	"sales_production_submission_material_approved",
);
export const salesProductionSubmissionMaterialRejected = decisionHandler(
	"sales_production_submission_material_rejected",
);
