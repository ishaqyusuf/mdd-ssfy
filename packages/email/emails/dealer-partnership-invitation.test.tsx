import { describe, expect, it } from "bun:test";
import { render } from "../render";
import DealerPartnershipInvitationEmail from "./dealer-partnership-invitation";

describe("dealer partnership invitation email", () => {
	it("renders active campaign content and the secure application CTA", async () => {
		const html = await render(
			<DealerPartnershipInvitationEmail
				accentColor="#0f766e"
				benefitText="Serve your customers with dealer pricing and office fulfillment."
				ctaLabel="Request partnership"
				headline="Grow with GND"
				invitationUrl="https://gndprodesk.com/dealer-program/opaque-token"
				recipientName="Acme Millwork"
			/>,
		);

		expect(html).toContain("Grow with GND");
		expect(html).toContain("dealer pricing and office fulfillment");
		expect(html).toContain("Request partnership");
		expect(html).toContain("opaque-token");
	});
});
