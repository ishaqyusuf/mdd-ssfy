import { describe, expect, it } from "bun:test";
import { salesCustomerPaymentReceived } from "../src/types/sales-customer-payment-received";
import { salesEmailReminder } from "../src/types/sales-email-reminder";
import { simpleSalesDocumentEmail } from "../src/types/simple-sales-document-email";

const pdfAttachment = {
	filename: "INV-100.pdf",
	content: Buffer.from("pdf").toString("base64"),
	contentType: "application/pdf" as const,
};

const sale = {
	orderId: "100",
	po: "PO-1",
	date: new Date("2026-01-01"),
	total: 100,
	due: 50,
};

describe("sales PDF email attachments", () => {
	it("attaches PDFs for simple sales document emails without passing PDF links to the template", () => {
		const email = simpleSalesDocumentEmail.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				paymentLink: "https://example.com/checkout/token",
				pdfLink: null,
				pdfAttachment,
				sales: [sale],
			} as never,
			{} as never,
			{} as never,
			{},
		);

		expect(email?.attachments).toEqual([pdfAttachment]);
		expect(email?.data).toMatchObject({
			hasPdfAttachment: true,
			paymentLink: "https://example.com/checkout/token",
		});
		expect(email?.data).not.toHaveProperty("pdfLink");
	});

	it("attaches PDFs for sales reminder emails without passing PDF links to the template", () => {
		const email = salesEmailReminder.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				paymentLink: null,
				pdfLink: null,
				pdfAttachment,
				sales: [sale],
			} as never,
			{} as never,
			{} as never,
			{},
		);

		expect(email?.attachments).toEqual([pdfAttachment]);
		expect(email?.data).toMatchObject({
			hasPdfAttachment: true,
		});
		expect(email?.data).not.toHaveProperty("pdfLink");
	});

	it("attaches invoices for customer payment receipt emails without download links", () => {
		const email = salesCustomerPaymentReceived.createEmail?.(
			{
				customerEmail: "customer@example.com",
				customerName: "Customer",
				paymentMethod: "card",
				totalAmount: 100,
				invoiceDownloadUrl: null,
				invoicePdfAttachment: pdfAttachment,
				sales: [
					{
						salesId: 1,
						orderNo: "100",
						amountApplied: 100,
						remainingDue: 0,
					},
				],
			},
			{} as never,
			{} as never,
			{},
		);

		expect(email?.attachments).toEqual([pdfAttachment]);
		expect(email?.data).toMatchObject({
			invoiceDownloadUrl: null,
			invoicePdfAttachment: pdfAttachment,
		});
	});
});
