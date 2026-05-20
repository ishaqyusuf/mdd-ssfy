import { describe, expect, it } from "bun:test";
import { dealerMagicLoginLink } from "../src/types/dealer-magic-login-link";
import { dealerPasswordReset } from "../src/types/dealer-password-reset";

const loginPayload = {
	dealerName: "Acme Dealer",
	dealerEmail: "dealer@example.com",
	loginLink: "https://dealers.gndprodesk.com/api/auth/magic-link/verify",
	expiresInMinutes: 10,
};

const resetPayload = {
	dealerName: "Acme Dealer",
	dealerEmail: "dealer@example.com",
	resetLink: "https://dealers.gndprodesk.com/reset-password?token=abc123",
	expiresInMinutes: 60,
};

describe("dealer auth email notifications", () => {
	it("sends magic login links directly to the dealer email", () => {
		const contact = dealerMagicLoginLink.createDirectEmailContact?.(
			loginPayload,
			{} as never,
		);
		const email = dealerMagicLoginLink.createEmail?.(
			loginPayload,
			{} as never,
			{} as never,
			{},
		);

		expect(contact).toMatchObject({
			name: "Acme Dealer",
			email: "dealer@example.com",
			emailNotification: true,
			inAppNotification: false,
		});
		expect(email).toMatchObject({
			template: "dealer-magic-login-link",
			to: ["dealer@example.com"],
			subject: "Log in to your GND dealer portal",
			data: {
				dealerName: "Acme Dealer",
				loginLink: loginPayload.loginLink,
				expiresInMinutes: 10,
			},
		});
	});

	it("sends password reset links directly to the dealer email", () => {
		const contact = dealerPasswordReset.createDirectEmailContact?.(
			resetPayload,
			{} as never,
		);
		const email = dealerPasswordReset.createEmail?.(
			resetPayload,
			{} as never,
			{} as never,
			{},
		);

		expect(contact).toMatchObject({
			name: "Acme Dealer",
			email: "dealer@example.com",
			emailNotification: true,
			inAppNotification: false,
		});
		expect(email).toMatchObject({
			template: "dealer-password-reset",
			to: ["dealer@example.com"],
			subject: "Reset your GND dealer portal password",
			data: {
				dealerName: "Acme Dealer",
				resetLink: resetPayload.resetLink,
				expiresInMinutes: 60,
			},
		});
	});
});
