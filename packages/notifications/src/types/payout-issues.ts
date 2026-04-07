import type { NotificationHandler } from "../base";
import {
	type PayoutIssuesInput,
	type PayoutIssuesTags,
	payoutIssuesSchema,
} from "../schemas";

export const payoutIssues: NotificationHandler = {
	schema: payoutIssuesSchema,
	createActivity(data: PayoutIssuesInput, author) {
		const payload: PayoutIssuesTags = {
			type: "payout_issues",
			source: "user",
			priority: 5,
			paymentId: data.paymentId,
			contractorId: data.contractorId,
			jobCount: data.jobCount,
			issueCount: data.issueCount,
			amount: data.amount,
			reason: data.reason,
		};

		return {
			type: "payout_issues",
			source: "user",
			subject: "Payout issues detected",
			headline: `Payout #${data.paymentId} can not be reversed.`,
			note: data.reason,
			authorId: author.id,
			tags: payload,
		};
	},
};
