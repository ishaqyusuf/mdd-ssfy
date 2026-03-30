import type { NotificationHandler } from "../base";
import {
	type CommunityUnitProductionStartedInput,
	type CommunityUnitProductionStartedTags,
	communityUnitProductionStartedSchema,
} from "../schemas";

export const communityUnitProductionStarted: NotificationHandler = {
	schema: communityUnitProductionStartedSchema,
	createActivity(data, author) {
		const payload: CommunityUnitProductionStartedTags = {
			type: "community_unit_production_started",
			source: "user",
			priority: 5,
			taskId: data.taskId,
			...(data.unitId != null ? { unitId: data.unitId } : {}),
			...(data.projectId != null ? { projectId: data.projectId } : {}),
		};

		const titleParts = [data.projectName, data.unitLotBlock, data.taskName, "started"]
			.filter(Boolean)
			.join(" ");

		return {
			type: "community_unit_production_started",
			source: "user",
			subject: titleParts || "Production task started",
			headline: `${data.actorName} started this production task.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
