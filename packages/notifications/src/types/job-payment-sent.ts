import type { NotificationHandler } from "../base";
import {
	type JobPaymentSentInput,
	type JobPaymentSentTags,
	jobPaymentSentSchema,
} from "../schemas";

export const jobPaymentSent: NotificationHandler = {
	schema: jobPaymentSentSchema,
	createActivity(data: JobPaymentSentInput, author) {
		const payload: JobPaymentSentTags = {
			type: "job_payment_sent",
			source: "user",
			priority: 5,
			paymentId: data.paymentId,
			contractorId: data.contractorId,
			jobCount: data.jobCount,
			amount: data.amount,
			paymentMethod: data.paymentMethod,
		};

		return {
			type: "job_payment_sent",
			source: "user",
			subject: "Payment sent",
			headline: `Payment #${data.paymentId} has been sent for ${data.jobCount} job${data.jobCount === 1 ? "" : "s"}.`,
			note: `$${data.amount.toFixed(2)} via ${data.paymentMethod}`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, author, user, args) {
		return {
			...args,
			template: "job-payment-sent",
			to: [user.email],
			subject: `Payment #${data.paymentId} Sent`,
			data: {
				recipientName: user.name || "Contractor",
				paymentId: data.paymentId,
				jobCount: data.jobCount,
				amount: data.amount,
				paymentMethod: data.paymentMethod,
			},
		};
	},
};
