// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { render } from "../render";
import ComposedSalesDocumentEmail from "./composed-sales-document-email";
import SalesEmail from "./sales-email";

const sale = {
	orderId: "0042",
	date: new Date("2026-07-19T12:00:00.000Z"),
	total: 1200,
	due: 600,
};

const banner = {
	headline: "Grow with the GND Dealership Program",
	benefitText:
		"Serve your customers with dealer pricing and office fulfillment.",
	ctaLabel: "Request partnership",
	accentColor: "#0f766e",
	url: "https://gndprodesk.com/dealer-program/opaque-token",
};

describe("dealership recruitment sales-email banner", () => {
	it("renders a personalized banner at the top of a standard sales email", async () => {
		const html = await render(
			<SalesEmail
				customerName="Acme Millwork"
				dealerProgramBanner={{ ...banner, placement: "TOP" }}
				sales={[sale]}
			/>,
		);

		expect(html).toContain(banner.headline);
		expect(html).toContain(banner.benefitText);
		expect(html).toContain("opaque-token");
		expect(html.indexOf(banner.headline)).toBeLessThan(
			html.indexOf("Invoice Ready for Payment"),
		);
	});

	it("renders the same contract at the bottom of a composed sales email", async () => {
		const html = await render(
			<ComposedSalesDocumentEmail
				customerName="Acme Millwork"
				dealerProgramBanner={{ ...banner, placement: "BOTTOM" }}
				sales={[sale]}
				subject="Your July invoice"
			/>,
		);

		expect(html).toContain(banner.headline);
		expect(html).toContain("Request partnership");
		expect(html.indexOf(banner.headline)).toBeGreaterThan(
			html.indexOf("Your July invoice"),
		);
	});

	it("does not render recruitment content when no banner is provided", async () => {
		const html = await render(
			<SalesEmail customerName="Acme Millwork" sales={[sale]} />,
		);

		expect(html).not.toContain(banner.headline);
		expect(html).not.toContain("opaque-token");
	});
});
