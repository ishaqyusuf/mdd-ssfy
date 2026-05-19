import type { NotificationHandler, UserData } from "../base";
import {
	type AuthNewDeviceLoginTags,
	authNewDeviceLoginSchema,
} from "../schemas";

export const authNewDeviceLogin: NotificationHandler = {
	schema: authNewDeviceLoginSchema,
	skipActivity: true,
	createDirectEmailContact(data): UserData {
		return {
			id: 0,
			profileId: 0,
			name: data.accountName || data.accountEmail,
			email: data.accountEmail,
			role: "employee",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data, author) {
		const payload: AuthNewDeviceLoginTags = {
			type: "auth_new_device_login",
			source: "system",
			priority: 8,
			accountEmail: data.accountEmail,
			appSurface: data.appSurface,
			deviceKey: data.deviceKey,
		};

		return {
			type: "auth_new_device_login",
			source: "system",
			subject: "New device login",
			headline: `${data.accountEmail} signed in from ${data.deviceLabel}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "auth-new-device-login",
			to: [data.accountEmail],
			from: "GND Security <noreply@gndprodesk.com>",
			replyTo: data.supportEmail || "noreply@gndprodesk.com",
			subject: "New device login to your GND account",
			data: {
				accountName: data.accountName || "there",
				accountEmail: data.accountEmail,
				appSurface: data.appSurface,
				deviceLabel: data.deviceLabel,
				ipAddress: data.ipAddress,
				userAgent: data.userAgent,
				loginAt: data.loginAt,
				supportEmail: data.supportEmail || "support@gndprodesk.com",
				securityMessage:
					data.securityMessage ||
					"If this was you, no action is needed. If you do not recognize this login, contact support immediately.",
			},
		};
	},
};
