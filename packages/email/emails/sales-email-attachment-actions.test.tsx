import { describe, expect, it } from "bun:test";
import { render } from "../render";
import ComposedSalesDocumentEmail from "./composed-sales-document-email";
import SalesEmail from "./sales-email";

const pdfLink = "https://example.com/api/download/sales-v2?token=pdf-token";

const sale = {
	orderId: "0042",
	date: new Date("2026-07-23T12:00:00.000Z"),
	total: 1200,
	due: 600,
};

describe("sales email attachment actions", () => {
	it("renders explicit light colors and the resolved sales signature", async () => {
		const html = await render(
			<SalesEmail
				customerName="Acme Millwork"
				sales={[sale]}
				salesRepName="Jordan Lee"
			/>,
		);

		expect(html).toContain("#17211d");
		expect(html).toContain("#fffefa");
		expect(html).toContain("Jordan Lee");
		expect(html).toContain("Sales · GND Millwork");
	});

	it("hides invoice download actions when the PDF is attached", async () => {
		const html = await render(
			<SalesEmail
				customerName="Acme Millwork"
				hasPdfAttachment
				paymentLink="https://example.com/pay"
				pdfLink={pdfLink}
				sales={[sale]}
			/>,
		);

		expect(html).not.toContain("Download the invoice PDF");
		expect(html).not.toContain("Download PDF");
		expect(html).toContain("Make Payment");
	});

	it("hides quote download actions while retaining quote acceptance", async () => {
		const html = await render(
			<SalesEmail
				acceptQuoteLink="https://example.com/accept"
				customerName="Acme Millwork"
				hasPdfAttachment
				isQuote
				pdfLink={pdfLink}
				sales={[sale]}
			/>,
		);

		expect(html).not.toContain("Download PDF");
		expect(html).toContain("Accept Quote");
	});

	it("hides composed-email download actions when the PDF is attached", async () => {
		const html = await render(
			<ComposedSalesDocumentEmail
				customerName="Acme Millwork"
				hasPdfAttachment
				pdfLink={pdfLink}
				sales={[sale]}
				subject="Your invoice"
			/>,
		);

		expect(html).not.toContain("Download a PDF copy");
		expect(html).not.toContain("Download PDF");
	});

	it("keeps the download fallback when no attachment is available", async () => {
		const html = await render(
			<SalesEmail
				customerName="Acme Millwork"
				pdfLink={pdfLink}
				sales={[sale]}
			/>,
		);

		expect(html).toContain("Download the invoice PDF");
		expect(html).toContain("Download PDF");
	});
});
