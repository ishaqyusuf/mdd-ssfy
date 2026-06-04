import type { NotificationHandler, UserData } from "../base";
import {
	type AuthMasterPasswordLoginAlertTags,
	authMasterPasswordLoginAlertSchema,
} from "../schemas";

export const authMasterPasswordLoginAlert: NotificationHandler = {
	schema: authMasterPasswordLoginAlertSchema,
	skipActivity: true,
	createDirectEmailContact(data): UserData {
		return {
			id: 0,
			profileId: 0,
			name: "GND Security",
			email: data.accountEmail,
			role: "employee",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data, author) {
		const payload: AuthMasterPasswordLoginAlertTags = {
			type: "auth_master_password_login_alert",
			source: "system",
			priority: 9,
			accountEmail: data.accountEmail,
			appSurface: data.appSurface,
			sessionId: data.sessionId,
		};

		return {
			type: "auth_master_password_login_alert",
			source: "system",
			subject: "Master password login activity",
			headline: `${data.accountEmail} was accessed with a master password.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "auth-master-password-login-alert",
			to: [data.accountEmail],
			from: "GND Security <noreply@gndprodesk.com>",
			replyTo: data.supportEmail || "support@gndprodesk.com",
			subject: "Master password login activity",
			data: {
				accountName: data.accountName || null,
				accountEmail: data.accountEmail,
				appSurface: data.appSurface,
				loginAt: data.loginAt,
				ipAddress: data.ipAddress,
				userAgent: data.userAgent,
				sessionId: data.sessionId,
				actorLabel: data.actorLabel || "Master password",
				supportEmail: data.supportEmail || "support@gndprodesk.com",
			},
		};
	},
};
