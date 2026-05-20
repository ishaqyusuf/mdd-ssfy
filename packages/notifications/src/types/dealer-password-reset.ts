import type { NotificationHandler, UserData } from "../base";
import {
	type DealerPasswordResetTags,
	dealerPasswordResetSchema,
} from "../schemas";

export const dealerPasswordReset: NotificationHandler = {
	schema: dealerPasswordResetSchema,
	skipActivity: true,
	createDirectEmailContact(data): UserData {
		return {
			id: 0,
			profileId: 0,
			name: data.dealerName || data.dealerEmail,
			email: data.dealerEmail,
			role: "address",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data, author) {
		const payload: DealerPasswordResetTags = {
			type: "dealer_password_reset",
			source: "system",
			priority: 8,
			dealerEmail: data.dealerEmail,
		};

		return {
			type: "dealer_password_reset",
			source: "system",
			subject: "Dealer password reset sent",
			headline: `Dealer password reset sent to ${data.dealerEmail}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "dealer-password-reset",
			to: [data.dealerEmail],
			from: "GND Security <noreply@gndprodesk.com>",
			replyTo: "support@gndprodesk.com",
			subject: "Reset your GND dealer portal password",
			data: {
				dealerName: data.dealerName || "there",
				resetLink: data.resetLink,
				expiresInMinutes: data.expiresInMinutes || 60,
			},
		};
	},
};
