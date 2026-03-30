import type { NotificationHandler } from "../base";
import {
	type CommunityUnitProductionStoppedInput,
	type CommunityUnitProductionStoppedTags,
	communityUnitProductionStoppedSchema,
} from "../schemas";

export const communityUnitProductionStopped: NotificationHandler = {
	schema: communityUnitProductionStoppedSchema,
	createActivity(data, author) {
		const payload: CommunityUnitProductionStoppedTags = {
			type: "community_unit_production_stopped",
			source: "user",
			priority: 5,
			taskId: data.taskId,
			...(data.unitId != null ? { unitId: data.unitId } : {}),
			...(data.projectId != null ? { projectId: data.projectId } : {}),
		};

		const titleParts = [data.projectName, data.unitLotBlock, data.taskName, "stopped"]
			.filter(Boolean)
			.join(" ");

		return {
			type: "community_unit_production_stopped",
			source: "user",
			subject: titleParts || "Production task stopped",
			headline: `${data.actorName} stopped this production task.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
