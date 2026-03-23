import type { NotificationHandler } from "../base";
import {
	type EmployeeDocumentReviewTags,
	employeeDocumentReviewSchema,
} from "../schemas";

export const employeeDocumentReview: NotificationHandler = {
	schema: employeeDocumentReviewSchema,
	createActivity(data, author) {
		const payload: EmployeeDocumentReviewTags = {
			type: "employee_document_review",
			source: "user",
			priority: 5,
			documentId: data.documentId,
			userId: data.userId,
			userName: data.userName,
			documentTitle: data.documentTitle,
			documentUrl: data.documentUrl,
			description: data.description ?? null,
			expiresAt: data.expiresAt ?? null,
		};

		return {
			type: "employee_document_review",
			source: "user",
			subject: "Document uploaded for review",
			headline: `${data.userName} uploaded ${data.documentTitle} for review.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
