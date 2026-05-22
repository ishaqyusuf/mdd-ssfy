import {
	type DealerAuthEmailInput,
	setDealerMagicLoginLinkHandler,
	setDealerPasswordResetHandler,
} from "@gnd/auth/better-auth/dealership";
import type { NotificationJobInput } from "@gnd/notifications/schemas";
import { tasks } from "@trigger.dev/sdk/v3";

function getExpiresInMinutes(input: DealerAuthEmailInput) {
	return Math.max(1, Math.ceil(input.expiresInSeconds / 60));
}

function getDealerName(input: DealerAuthEmailInput) {
	return input.accountName || input.accountEmail;
}

const securityAuthor = {
	id: 0,
	role: "employee" as const,
};

async function sendDealerMagicLoginLink(input: DealerAuthEmailInput) {
	try {
		const payload = {
			channel: "dealer_magic_login_link",
			author: securityAuthor,
			recipients: null,
			payload: {
				dealerName: getDealerName(input),
				dealerEmail: input.accountEmail,
				loginLink: input.url,
				expiresInMinutes: getExpiresInMinutes(input),
			},
		} satisfies NotificationJobInput;

		const result = await tasks.trigger("notification", payload);
		console.info("Dealer magic login notification queued:", {
			email: input.accountEmail,
			result,
		});
	} catch (error) {
		console.error("Failed to send dealer magic login link:", error);
		throw error;
	}
}

async function sendDealerPasswordReset(input: DealerAuthEmailInput) {
	try {
		const payload = {
			channel: "dealer_password_reset",
			author: securityAuthor,
			recipients: null,
			payload: {
				dealerName: getDealerName(input),
				dealerEmail: input.accountEmail,
				resetLink: input.url,
				expiresInMinutes: getExpiresInMinutes(input),
			},
		} satisfies NotificationJobInput;

		const result = await tasks.trigger("notification", payload);
		console.info("Dealer password reset notification queued:", {
			email: input.accountEmail,
			result,
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
