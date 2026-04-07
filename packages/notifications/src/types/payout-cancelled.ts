import type { NotificationHandler } from "../base";
import {
	type PayoutCancelledInput,
	type PayoutCancelledTags,
	payoutCancelledSchema,
} from "../schemas";

export const payoutCancelled: NotificationHandler = {
	schema: payoutCancelledSchema,
	createActivity(data: PayoutCancelledInput, author) {
		const payload: PayoutCancelledTags = {
			type: "payout_cancelled",
			source: "user",
			priority: 5,
			paymentId: data.paymentId,
			contractorId: data.contractorId,
			jobCount: data.jobCount,
			amount: data.amount,
		};

		return {
			type: "payout_cancelled",
			source: "user",
			subject: "Payout cancelled",
			headline: `Payout #${data.paymentId} was cancelled.`,
			note: `${data.jobCount} job${data.jobCount === 1 ? "" : "s"} returned to unpaid.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
