import type { NotificationHandler } from "../base";
import {
	type CommunityUnitProductionCompletedInput,
	type CommunityUnitProductionCompletedTags,
	communityUnitProductionCompletedSchema,
} from "../schemas";

export const communityUnitProductionCompleted: NotificationHandler = {
	schema: communityUnitProductionCompletedSchema,
	createActivity(data, author) {
		const payload: CommunityUnitProductionCompletedTags = {
			type: "community_unit_production_completed",
			source: "user",
			priority: 5,
			taskId: data.taskId,
			...(data.unitId != null ? { unitId: data.unitId } : {}),
			...(data.projectId != null ? { projectId: data.projectId } : {}),
		};

		const titleParts = [data.projectName, data.unitLotBlock, data.taskName, "completed"]
			.filter(Boolean)
			.join(" ");

		return {
			type: "community_unit_production_completed",
			source: "user",
			subject: titleParts || "Production task completed",
			headline: data.completedFromIdle
				? `${data.actorName} started and completed this production task.`
				: `${data.actorName} completed this production task.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
