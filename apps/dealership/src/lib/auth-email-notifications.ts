import {
	type DealerAuthEmailInput,
	setDealerMagicLoginLinkHandler,
	setDealerPasswordResetHandler,
} from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import { Notifications } from "@gnd/notifications";

function getExpiresInMinutes(input: DealerAuthEmailInput) {
	return Math.max(1, Math.ceil(input.expiresInSeconds / 60));
}

function getDealerName(input: DealerAuthEmailInput) {
	return input.accountName || input.accountEmail;
}

function createSecurityNotification() {
	return new Notifications(db);
}

const securityNotificationOptions = {
	author: {
		id: 0,
		role: "employee" as const,
	},
	authorContact: {
		id: 0,
		profileId: 0,
		name: "GND Security",
		email: "noreply@gndprodesk.com",
		role: "employee" as const,
	},
	includeChannelSubscribers: false,
	allowFallbackRecipient: false,
};

async function sendDealerMagicLoginLink(input: DealerAuthEmailInput) {
	try {
		const result = await createSecurityNotification().create(
			"dealer_magic_login_link",
			{
				dealerName: getDealerName(input),
				dealerEmail: input.accountEmail,
				loginLink: input.url,
				expiresInMinutes: getExpiresInMinutes(input),
			},
			securityNotificationOptions,
		);
		console.info("Dealer magic login notification result:", {
			email: input.accountEmail,
			emails: result.emails,
		});
	} catch (error) {
		console.error("Failed to send dealer magic login link:", error);
		throw error;
	}
}

async function sendDealerPasswordReset(input: DealerAuthEmailInput) {
	try {
		const result = await createSecurityNotification().create(
			"dealer_password_reset",
			{
				dealerName: getDealerName(input),
				dealerEmail: input.accountEmail,
				resetLink: input.url,
				expiresInMinutes: getExpiresInMinutes(input),
			},
			securityNotificationOptions,
		);
		console.info("Dealer password reset notification result:", {
			email: input.accountEmail,
			emails: result.emails,
		});
	} catch (error) {
		console.error("Failed to send dealer password reset:", error);
		throw error;
	}
}

export function registerDealerAuthEmailNotifications() {
	setDealerMagicLoginLinkHandler((input) => {
		return sendDealerMagicLoginLink(input);
	});
	setDealerPasswordResetHandler((input) => {
		return sendDealerPasswordReset(input);
	});
}
