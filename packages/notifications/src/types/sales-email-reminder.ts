import type { Db } from "@gnd/db";
import { getAppUrl } from "@gnd/utils/envs";
import type { z } from "zod";
import type { NotificationHandler } from "../base";
import {
	type SalesEmailReminderInput,
	type SalesEmailReminderTags,
	salesEmailReminderSchema,
	salesPdfAttachmentSchema,
} from "../schemas";
import { buildSalesPdfAttachmentFromToken } from "./sales-pdf-attachment";
import { resolveSalesEmailDealerProgramBanner } from "./dealer-recruitment-banner";

type ResolvedSalesEmailReminderInput = SalesEmailReminderInput & {
	pdfAttachment?: z.infer<typeof salesPdfAttachmentSchema> | null;
};

export const salesEmailReminder: NotificationHandler = {
	schema: salesEmailReminderSchema.extend({
		pdfAttachment: salesPdfAttachmentSchema.optional().nullable(),
	}),
	createActivityWithoutContact: true,
	async extendData(db: Db, data: SalesEmailReminderInput) {
		const dealerProgramBanner = await resolveSalesEmailDealerProgramBanner(db, {
			customerEmail: data.customerEmail,
			salesIds: data.salesIds?.filter(
				(value): value is number => typeof value === "number",
			),
			salesNos: data.salesNos?.filter(
				(value): value is string => typeof value === "string",
			),
		});
		return {
			...data,
			dealerProgramBanner,
			...(data.pdfToken && !data.pdfAttachment
				? {
						pdfLink: null,
						pdfAttachment: await buildSalesPdfAttachmentFromToken(
							db,
							data.pdfToken,
						),
					}
				: {}),
		};
	},
	createActivity(data: ResolvedSalesEmailReminderInput, author) {
		const docType = data.type === "quote" ? "Quote" : "Invoice";
		const payload: SalesEmailReminderTags = {
			type: "sales_email_reminder",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			salesCount: data.sales.length,
			reminderType: data.type,
			salesNo: data.sales.map((a) => a.orderId),
			hasPaymentLink: Boolean(data.paymentLink || data.paymentToken),
			hasPdfLink: false,
			hasPdfAttachment: Boolean(data.pdfAttachment),
			dealerProgramCampaignId:
				data.dealerProgramBanner?.campaignId || undefined,
		};

		return {
			type: "sales_email_reminder",
			source: "system",
			subject: "Sales reminder email sent",
			headline: `${docType} reminder sent to ${data.customerName} (${data.customerEmail}) for ${data.sales.length} document${data.sales.length > 1 ? "s" : ""}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data: ResolvedSalesEmailReminderInput, author, user, args) {
		const isQuote = data.type === "quote";
		const appUrl = getAppUrl();
		const paymentLink =
			data.paymentLink ||
			(data.paymentToken && appUrl
				? `${appUrl}/checkout/${data.paymentToken}/v2`
				: undefined);

		return {
			...args,
			template: "sales-email-reminder",
			to: [data.customerEmail],
			from: `GND Millwork <${data.salesRepEmail.split("@")[0]}@gndprodesk.com>`,
			subject: `${data.salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
			attachments: data.pdfAttachment ? [data.pdfAttachment] : undefined,
			data: {
				isQuote,
				customerName: data.customerName,
				note: data.note || undefined,
				paymentLink: paymentLink || undefined,
				hasPdfAttachment: Boolean(data.pdfAttachment),
				dealerProgramBanner: data.dealerProgramBanner || undefined,
				sales: data.sales.map((sale) => ({
					...sale,
					date:
						sale.date instanceof Date ? sale.date : new Date(String(sale.date)),
					po: sale.po || undefined,
				})),
			},
		};
	},
};
