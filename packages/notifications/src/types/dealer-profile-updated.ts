import type { NotificationHandler, UserData } from "../base";
import {
	type DealerProfileUpdatedTags,
	dealerProfileUpdatedSchema,
} from "../schemas";

export const dealerProfileUpdated: NotificationHandler = {
	schema: dealerProfileUpdatedSchema,
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
		const assigned = !data.previousProfileName;
		const payload: DealerProfileUpdatedTags = {
			type: "dealer_profile_updated",
			source: "user",
			priority: 5,
			dealerId: data.dealerId,
			dealerEmail: data.dealerEmail,
			previousProfileName: data.previousProfileName,
			newProfileName: data.newProfileName,
		};

		return {
			type: "dealer_profile_updated",
			source: "user",
			subject: assigned
				? "Dealership profile assigned"
				: "Dealership profile updated",
			headline: assigned
				? `${data.dealerName} was assigned the ${data.newProfileName} dealership profile.`
				: `${data.dealerName}'s dealership profile was updated to ${data.newProfileName}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		const assigned = !data.previousProfileName;

		return {
			...args,
			template: "dealer-profile-updated",
			to: [data.dealerEmail],
			from: "GND Millwork <noreply@gndprodesk.com>",
			subject: assigned
				? "Your GND dealership profile has been assigned"
				: "Your GND dealership profile has been updated",
			data: {
				dealerName: data.dealerName,
				previousProfileName: data.previousProfileName,
				newProfileName: data.newProfileName,
				effectiveAt: data.effectiveAt,
				dealershipUrl: data.dealershipUrl,
			},
		};
	},
};
