import {
	type DealerNewDeviceLoginAlertInput,
	setDealerNewDeviceLoginAlertHandler,
} from "@gnd/auth/better-auth/dealership";
import {
	isNewLoginDevice,
	normalizeLoginDevice,
} from "@gnd/auth/new-device-login";
import { db } from "@gnd/db";
import { Notifications } from "@gnd/notifications";

async function sendDealerNewDeviceLoginAlert(
	input: DealerNewDeviceLoginAlertInput,
) {
	try {
		const sessions = await db.dealerAuthSession.findMany({
			where: {
				userId: input.userId,
			},
			select: {
				id: true,
				userAgent: true,
			},
		});
		if (
			!isNewLoginDevice(input.userAgent, sessions, {
				excludeSessionId: input.sessionId,
			})
		) {
			return;
		}

		const dealer = await db.dealerAuth.findUnique({
			where: {
				authUserId: input.userId,
			},
			select: {
				companyName: true,
				name: true,
			},
		});
		const device = normalizeLoginDevice(input.userAgent);
		const notifications = new Notifications(db);

		await notifications.create(
			"auth_new_device_login",
			{
				accountName:
					dealer?.companyName ||
					dealer?.name ||
					input.accountName ||
					input.accountEmail,
				accountEmail: input.accountEmail,
				appSurface: "dealership",
				deviceLabel: device.label,
				deviceKey: device.key,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
				loginAt: new Date().toISOString(),
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
			},
		);
	} catch (error) {
		console.error("Failed to send dealer new device login alert:", error);
	}
}

export function registerDealerNewDeviceLoginAlert() {
	setDealerNewDeviceLoginAlertHandler((input) => {
		void sendDealerNewDeviceLoginAlert(input);
	});
}
