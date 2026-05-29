import { describe, expect, it } from "bun:test";
import { dealerProfileUpdated } from "../src/types/dealer-profile-updated";

const payload = {
	dealerId: 123,
	dealerName: "Acme Dealer",
	dealerEmail: "dealer@example.com",
	previousProfileName: "Standard",
	newProfileName: "Preferred",
	effectiveAt: "2026-05-28T00:00:00.000Z",
	dealershipUrl: "https://dealers.gndprodesk.com",
};

describe("dealer profile updated notification", () => {
	it("creates a direct email contact for dealers", () => {
		expect(
			dealerProfileUpdated.createDirectEmailContact?.(payload, {} as never),
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

	it("sends the profile update email to the dealer email", () => {
		const email = dealerProfileUpdated.createEmail?.(
			payload,
			{} as never,
			{} as never,
			{},
		);

		expect(email).toMatchObject({
			template: "dealer-profile-updated",
			to: ["dealer@example.com"],
			from: "GND Millwork <noreply@gndprodesk.com>",
			subject: "Your GND dealership profile has been updated",
			data: {
				dealerName: "Acme Dealer",
				previousProfileName: "Standard",
				newProfileName: "Preferred",
				effectiveAt: payload.effectiveAt,
				dealershipUrl: payload.dealershipUrl,
			},
		});
		expect(JSON.stringify(email)).not.toContain("coefficient");
	});

	it("uses assigned language for first-time profile assignment", () => {
		const email = dealerProfileUpdated.createEmail?.(
			{
				...payload,
				previousProfileName: null,
			},
			{} as never,
			{} as never,
			{},
		);

		expect(email?.subject).toBe(
			"Your GND dealership profile has been assigned",
		);
		expect(JSON.stringify(email)).not.toContain("coefficient");
	});
});
