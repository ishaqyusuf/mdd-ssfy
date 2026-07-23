import { describe, expect, it } from "bun:test";
import { composedSalesDocumentEmail } from "../src/types/composed-sales-document-email";
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
	it("passes simple sales document PDF links to the template", () => {
		const email = simpleSalesDocumentEmail.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				paymentLink: "https://example.com/checkout/token",
				pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
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
			pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
		});
	});

	it("sends simple sales document emails without PDF attachment state when PDF generation is unavailable", () => {
		const email = simpleSalesDocumentEmail.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				paymentLink: null,
				pdfLink: null,
				pdfAttachment: null,
				sales: [sale],
			} as never,
			{} as never,
			{} as never,
			{},
		);

		expect(email?.attachments).toBeUndefined();
		expect(email?.data).toMatchObject({
			hasPdfAttachment: false,
		});
		expect(email?.data).not.toHaveProperty("pdfLink");
	});

	it("uses a direct customer contact for simple sales document emails", () => {
		const contact = simpleSalesDocumentEmail.createDirectEmailContact?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				paymentLink: null,
				pdfLink: null,
				pdfAttachment: null,
				sales: [sale],
			} as never,
			{} as never,
		);

		expect(contact).toMatchObject({
			email: "customer@example.com",
			name: "Customer",
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		});
	});

	it("sends composed sales document emails without PDF attachment state when PDF generation is unavailable", () => {
		const email = composedSalesDocumentEmail.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				subject: "Invoice ready",
				message: "Please review your invoice.",
				paymentLink: null,
				pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
				pdfAttachment: null,
				sales: [sale],
			} as never,
			{} as never,
			{} as never,
			{},
		);

		expect(email?.attachments).toBeUndefined();
		expect(email?.data).toMatchObject({
			subject: "Invoice ready",
			hasPdfAttachment: false,
			pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
		});
	});

	it("marks composed sales document emails when the PDF is attached", () => {
		const email = composedSalesDocumentEmail.createEmail?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				subject: "Invoice ready",
				message: "Please review your invoice.",
				paymentLink: null,
				pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
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
			pdfLink: "https://example.com/api/download/sales-v2?token=pdf-token",
		});
	});

	it("uses a direct customer contact for composed sales document emails", () => {
		const contact = composedSalesDocumentEmail.createDirectEmailContact?.(
			{
				type: "order",
				customerEmail: "customer@example.com",
				customerName: "Customer",
				salesRep: "Sales Rep",
				salesRepEmail: "rep@gndprodesk.com",
				subject: "Invoice ready",
				message: "Please review your invoice.",
				paymentLink: null,
				pdfAttachment: null,
				sales: [sale],
			} as never,
			{} as never,
		);

		expect(contact).toMatchObject({
			email: "customer@example.com",
			name: "Customer",
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		});
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
		const contact = salesCustomerPaymentReceived.createDirectEmailContact?.(
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
		);
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
		expect(email).toMatchObject({
			template: "sales-customer-payment-received",
			to: ["customer@example.com"],
			subject: "Payment received for order 100",
		});
		expect(email?.data).toMatchObject({
			invoiceDownloadUrl: null,
			invoicePdfAttachment: pdfAttachment,
		});
		expect(contact).toMatchObject({
			email: "customer@example.com",
			emailNotification: true,
			inAppNotification: false,
			name: "Customer",
			role: "customer",
		});
	});
});
