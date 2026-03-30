import type { NotificationHandler } from "../base";
import {
	type CommunityUnitProductionBatchUpdatedInput,
	type CommunityUnitProductionBatchUpdatedTags,
	communityUnitProductionBatchUpdatedSchema,
} from "../schemas";

function resolveActionVerb(action: CommunityUnitProductionBatchUpdatedInput["action"]) {
	switch (action) {
		case "start":
			return "started";
		case "stop":
			return "stopped";
		default:
			return "completed";
	}
}

export const communityUnitProductionBatchUpdated: NotificationHandler = {
	schema: communityUnitProductionBatchUpdatedSchema,
	createActivity(data, author) {
		const payload: CommunityUnitProductionBatchUpdatedTags = {
			type: "community_unit_production_batch_updated",
			source: "user",
			priority: 5,
			taskId: data.taskIds,
			unitId: data.unitIds,
			projectId: data.projectIds,
		};

		const actionVerb = resolveActionVerb(data.action);
		const subject = data.projectName
			? `${data.projectName} ${data.count} production tasks ${actionVerb}`
			: `${data.count} production tasks ${actionVerb}`;

		return {
			type: "community_unit_production_batch_updated",
			source: "user",
			subject,
			headline: `${data.actorName} ${actionVerb} ${data.count} production tasks.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
