import { describe, expect, it } from "bun:test";
import { render } from "../render";
import StorefrontCustomInquiryReceived from "./storefront-custom-inquiry-received";

describe("StorefrontCustomInquiryReceived", () => {
	it("renders the customer reference without promising a quote", async () => {
		const html = await render(
			<StorefrontCustomInquiryReceived
				name="Acme Builders"
				reference="CMW-ABC123"
				projectSummary="Custom door"
			/>,
		);

		expect(html).toContain("CMW-ABC123");
		expect(html).toContain("Acme Builders");
		expect(html).toContain("Custom door");
		expect(html).toContain("not a quote or order");
	});
});
