import { describe, expect, it } from "bun:test";
import { dealerOnboarding } from "../src/types/dealer-onboarding";

const payload = {
	dealerId: 123,
	dealerName: "Acme Dealer",
	dealerEmail: "dealer@example.com",
	onboardingLink: "https://dealers.gndprodesk.com/create-password/token",
	expiresAt: "2026-05-26T00:00:00.000Z",
};

describe("dealer onboarding notification", () => {
	it("creates a direct email contact for invited dealers", () => {
		expect(
			dealerOnboarding.createDirectEmailContact?.(payload, {} as never),
		).toEqual({
			id: 123,
			profileId: 123,
			name: "Acme Dealer",
			email: "dealer@example.com",
			role: "address",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		});
	});

	it("sends the onboarding email to the dealer email", () => {
		const email = dealerOnboarding.createEmail?.(
			payload,
			{} as never,
			{} as never,
			{},
		);

		expect(email).toMatchObject({
			template: "dealer-onboarding",
			to: ["dealer@example.com"],
			from: "GND Millwork <noreply@gndprodesk.com>",
			subject: "Set up your GND dealer account",
			data: {
				dealerName: "Acme Dealer",
				onboardingLink: payload.onboardingLink,
				expiresAt: payload.expiresAt,
			},
		});
	});
});
