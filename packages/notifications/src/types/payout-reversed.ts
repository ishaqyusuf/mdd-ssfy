import type { NotificationHandler } from "../base";
import {
	type PayoutReversedInput,
	type PayoutReversedTags,
	payoutReversedSchema,
} from "../schemas";

export const payoutReversed: NotificationHandler = {
	schema: payoutReversedSchema,
	createActivity(data: PayoutReversedInput, author) {
		const payload: PayoutReversedTags = {
			type: "payout_reversed",
			source: "user",
			priority: 5,
			paymentId: data.paymentId,
			contractorId: data.contractorId,
			jobCount: data.jobCount,
			amount: data.amount,
		};

		return {
			type: "payout_reversed",
			source: "user",
			subject: "Payout reversed",
			headline: `Payout #${data.paymentId} was restored.`,
			note: `${data.jobCount} job${data.jobCount === 1 ? "" : "s"} linked back to the payout.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
