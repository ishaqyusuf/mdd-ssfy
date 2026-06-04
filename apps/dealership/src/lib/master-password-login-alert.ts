import {
	type DealerMasterPasswordLoginAlertInput,
	setDealerMasterPasswordLoginAlertHandler,
} from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import { Notifications } from "@gnd/notifications";

async function sendDealerMasterPasswordLoginAlert(
	input: DealerMasterPasswordLoginAlertInput,
) {
	try {
		const notifications = new Notifications(db);

		await notifications.create(
			"auth_master_password_login_alert",
			{
				accountName: input.accountName || input.accountEmail,
				accountEmail: input.accountEmail,
				appSurface: input.appSurface,
				loginAt: input.loginAt,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
				sessionId: input.sessionId,
				actorLabel: "Master password",
				supportEmail: "support@gndprodesk.com",
			},
			{
				author: {
					id: 0,
					role: "employee",
				},
				authorContact: {
					id: 0,
					profileId: 0,
					name: "GND Security",
					email: "noreply@gndprodesk.com",
					role: "employee",
				},
				includeChannelSubscribers: false,
				allowFallbackRecipient: false,
				testEmailMode: true,
			},
		);
	} catch (error) {
		console.error("Failed to send dealer master password login alert:", error);
	}
}

export function registerDealerMasterPasswordLoginAlert() {
	setDealerMasterPasswordLoginAlertHandler((input) => {
		void sendDealerMasterPasswordLoginAlert(input);
	});
}
