import type { NotificationHandler, UserData } from "../base";
import {
	type DealerMagicLoginLinkTags,
	dealerMagicLoginLinkSchema,
} from "../schemas";

export const dealerMagicLoginLink: NotificationHandler = {
	schema: dealerMagicLoginLinkSchema,
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
		const payload: DealerMagicLoginLinkTags = {
			type: "dealer_magic_login_link",
			source: "system",
			priority: 8,
			dealerEmail: data.dealerEmail,
		};

		return {
			type: "dealer_magic_login_link",
			source: "system",
			subject: "Dealer login link sent",
			headline: `Dealer login link sent to ${data.dealerEmail}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "dealer-magic-login-link",
			to: [data.dealerEmail],
			from: "GND Security <noreply@gndprodesk.com>",
			replyTo: "support@gndprodesk.com",
			subject: "Log in to your GND dealer portal",
			data: {
				dealerName: data.dealerName || "there",
				loginLink: data.loginLink,
				expiresInMinutes: data.expiresInMinutes || 10,
			},
		};
	},
};
