import type { NotificationHandler, UserData } from "../base";
import { type DealerOnboardingTags, dealerOnboardingSchema } from "../schemas";

export const dealerOnboarding: NotificationHandler = {
	schema: dealerOnboardingSchema,
	createDirectEmailContact(data): UserData {
		return {
			id: data.dealerId,
			profileId: data.dealerId,
			name: data.dealerName || data.dealerEmail,
			email: data.dealerEmail,
			role: "address",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data, author) {
		const payload: DealerOnboardingTags = {
			type: "dealer_onboarding",
			source: "user",
			priority: 5,
			dealerId: data.dealerId,
			dealerEmail: data.dealerEmail,
		};

		return {
			type: "dealer_onboarding",
			source: "user",
			subject: "Dealer onboarding sent",
			headline: `Dealer onboarding sent to ${data.dealerName}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "dealer-onboarding",
			to: [data.dealerEmail],
			from: "GND Millwork <noreply@gndprodesk.com>",
			subject: "Set up your GND dealer account",
			data: {
				dealerName: data.dealerName,
				onboardingLink: data.onboardingLink,
				expiresAt: data.expiresAt,
			},
		};
	},
};
