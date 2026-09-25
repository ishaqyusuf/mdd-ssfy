/** @jsxImportSource react */
import { describe, expect, it } from "bun:test";
import { render } from "../render";
import DealerMagicLoginLinkEmail from "./dealer-magic-login-link";
import DealerOnboardingEmail from "./dealer-onboarding";
import DealerPasswordResetEmail from "./dealer-password-reset";
import DealerProfileUpdatedEmail from "./dealer-profile-updated";
import DealerSalesRequestApprovedEmail from "./dealer-sales-request-approved";
import DealerSalesRequestRejectedEmail from "./dealer-sales-request-rejected";

describe("standard dealership emails", () => {
	it("keeps account access links and their distinct expiry guidance", async () => {
		const onboarding = await render(
			<DealerOnboardingEmail
				dealerName="Northside Millwork"
				expiresAt="2026-09-05T00:00:00.000Z"
				onboardingLink="https://example.com/onboard-token"
			/>,
		);
		const magic = await render(
			<DealerMagicLoginLinkEmail
				dealerName="Northside Millwork"
				expiresInMinutes={10}
				loginLink="https://example.com/magic-token"
			/>,
		);
		const reset = await render(
			<DealerPasswordResetEmail
				dealerName="Northside Millwork"
				expiresInMinutes={30}
				resetLink="https://example.com/reset-token"
			/>,
		);

		expect(onboarding).toContain("onboard-token");
		expect(onboarding).toContain("Sep 5, 2026");
		expect(magic).toContain("magic-token");
		expect(magic.replaceAll("<!-- -->", "")).toContain("10 minutes");
		expect(magic).toContain("only be used once");
		expect(reset).toContain("reset-token");
		expect(reset.replaceAll("<!-- -->", "")).toContain("30 minutes");
		expect(reset).toContain("did not request");
		for (const html of [onboarding, magic, reset]) {
			expect(html).toContain("GND MILLWORK");
			expect(html).toContain("Dealership");
		}
	});

	it("preserves assigned and updated profile states and optional account link", async () => {
		const assigned = await render(
			<DealerProfileUpdatedEmail
				dealerName="Northside Millwork"
				effectiveAt="2026-09-05T00:00:00.000Z"
				newProfileName="Preferred Dealer"
			/>,
		);
		const updated = await render(
			<DealerProfileUpdatedEmail
				dealerName="Northside Millwork"
				dealershipUrl="https://example.com/dealer-account"
				effectiveAt="2026-09-05T00:00:00.000Z"
				newProfileName="Preferred Dealer"
				previousProfileName="Standard Dealer"
			/>,
		);

		expect(assigned).toContain("Dealership Profile Assigned");
		expect(assigned).not.toContain("Previous profile");
		expect(assigned).not.toContain("View Dealer Account");
		expect(updated).toContain("Dealership Profile Updated");
		expect(updated).toContain("Standard Dealer");
		expect(updated).toContain("Preferred Dealer");
		expect(updated).toContain("dealer-account");
		expect(updated).toContain("Existing saved quotes keep their saved pricing");
	});

	it("shows payment and order actions only when supplied after approval", async () => {
		const approved = await render(
			<DealerSalesRequestApprovedEmail
				customerName="Jordan Lee"
				dealerName="Northside Millwork"
				orderNo="GND-10482"
				orderUrl="https://example.com/order"
				paymentUrl="https://example.com/pay"
				quoteNo="Q-10482"
				total={2480}
			/>,
		);
		const withoutActions = await render(
			<DealerSalesRequestApprovedEmail
				dealerName="Northside Millwork"
				quoteNo="Q-10482"
			/>,
		);

		expect(approved).toContain("$2,480.00");
		expect(approved).toContain("Make Payment");
		expect(approved).toContain("View Order");
		expect(approved).toContain('href="https://example.com/pay"');
		expect(approved).toContain('href="https://example.com/order"');
		expect(withoutActions).not.toContain("Make Payment");
		expect(withoutActions).not.toContain("View Order");
	});

	it("keeps rejection reason and contact guidance without adding an action", async () => {
		const html = await render(
			<DealerSalesRequestRejectedEmail
				customerName="Jordan Lee"
				dealerName="Northside Millwork"
				quoteNo="Q-10482"
				reason="The delivery address needs updating."
			/>,
		);

		expect(html).toContain("Order Request Not Approved");
		expect(html).toContain("The delivery address needs updating.");
		expect(html).toContain("contact your sales rep");
		expect(html).not.toContain("Review Request");
	});
});
