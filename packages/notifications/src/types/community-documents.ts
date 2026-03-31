import type { NotificationHandler } from "../base";
import {
	type CommunityDocumentsTags,
	communityDocumentsSchema,
} from "../schemas";

export const communityDocuments: NotificationHandler = {
	schema: communityDocumentsSchema,
	createActivity(data, author) {
		const count = data.documentIds.length;
		const suffix = count === 1 ? "" : "s";
		const payload: CommunityDocumentsTags = {
			type: "community_documents",
			source: "user",
			priority: 5,
			projectId: data.projectId,
			projectSlug: data.projectSlug,
			projectTitle: data.projectTitle,
			documentIds: data.documentIds,
			...(data.documentNames?.length
				? {
						documentNames: data.documentNames,
					}
				: {}),
		};

		const note = data.note?.trim() || undefined;
		const headline = note
			? `${data.uploadedByName} uploaded ${count} document${suffix} to ${data.projectTitle}. Note: ${note}`
			: `${data.uploadedByName} uploaded ${count} document${suffix} to ${data.projectTitle}.`;

		return {
			type: "community_documents",
			source: "user",
			subject: "Project documents uploaded",
			headline,
			note,
			authorId: author.id,
			tags: payload,
		};
	},
};
