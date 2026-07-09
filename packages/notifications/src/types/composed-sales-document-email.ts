import type { Db } from "@gnd/db";
import { logger } from "@gnd/logger";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { getAppUrl, shouldAttachSalesEmailPdf } from "@gnd/utils/envs";
import {
	type SalesPaymentTokenSchema,
	type SalesPdfToken,
	tryTokenize,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { z } from "zod";
import type { NotificationHandler, UserData } from "../base";
import {
	type ComposedSalesDocumentEmailInput,
	type ComposedSalesDocumentEmailTags,
	salesPdfAttachmentSchema,
} from "../schemas";
import { buildSalesPdfAttachment } from "./sales-pdf-attachment";

const DEFAULT_TEMPLATE_ID = "template-2";
const LINK_TTL_DAYS = 7;

function normalizeText(value: string | null | undefined) {
	return value?.trim() || null;
}

type LoadedSale = {
	id: number;
	orderId: string;
	type: "order" | "quote";
	customerEmail: string;
	customerName: string;
	salesRep: string;
	salesRepEmail: string;
	salesRepId: number | null;
	customerId: number | null;
	customerPhone: string | null;
	customerWalletId: number | null;
	po: string | null | undefined;
	date: Date;
	total: number;
	due: number;
};

const resolvedSchema = z.object({
	type: z.enum(["order", "quote"]),
	customerEmail: z.string().email(),
	customerName: z.string(),
	salesRep: z.string(),
	salesRepEmail: z.string().email(),
	salesRepId: z.number().optional().nullable(),
	subject: z.string().min(1),
	message: z.string().optional().nullable(),
	paymentLink: z.string().optional().nullable(),
	pdfLink: z.string().optional().nullable(),
	sales: z.array(
		z.object({
			orderId: z.string(),
			po: z.string().optional().nullable(),
			date: z.union([z.date(), z.string()]),
			total: z.number(),
			due: z.number(),
		}),
	),
	pdfAttachment: salesPdfAttachmentSchema.optional().nullable(),
	salesIds: z.array(z.number()).optional().nullable(),
	salesNos: z.array(z.string()).optional().nullable(),
	emailAttemptId: z.string().optional().nullable(),
	sourceAttemptId: z.string().optional().nullable(),
});

type ResolvedComposedSalesDocumentEmailInput = z.infer<typeof resolvedSchema>;

async function loadSales(db: Db, input: ComposedSalesDocumentEmailInput) {
	const inputCustomerEmail = normalizeText(input.customerEmail);
	const inputCustomerName = normalizeText(input.customerName);
	const sales = await db.salesOrders.findMany({
		where: {
			id: { in: input.salesIds },
		},
		select: {
			id: true,
			orderId: true,
			type: true,
			amountDue: true,
			grandTotal: true,
			createdAt: true,
			meta: true,
			customer: {
				select: {
					id: true,
					email: true,
					name: true,
					businessName: true,
					phoneNo: true,
					walletId: true,
				},
			},
			billingAddress: {
				select: {
					email: true,
					name: true,
				},
			},
			salesRep: {
				select: {
					id: true,
					email: true,
					name: true,
				},
			},
		},
	});

	return sales
		.map<LoadedSale | null>((sale) => {
			const customerEmail =
				normalizeText(sale.customer?.email) ||
				normalizeText(sale.billingAddress?.email) ||
				inputCustomerEmail;
			const customerName =
				normalizeText(sale.customer?.name) ||
				normalizeText(sale.customer?.businessName) ||
				normalizeText(sale.billingAddress?.name) ||
				inputCustomerName;
			const salesRepEmail = normalizeText(sale.salesRep?.email);
			const salesRep = normalizeText(sale.salesRep?.name) || "Sales Team";

			if (!customerEmail || !customerName || !salesRepEmail) {
				return null;
			}

			return {
				id: sale.id,
				orderId: sale.orderId,
				type: sale.type === "quote" ? "quote" : "order",
				customerEmail,
				customerName,
				salesRep,
				salesRepEmail,
				salesRepId: sale.salesRep?.id ?? null,
				customerId: sale.customer?.id ?? null,
				customerPhone: sale.customer?.phoneNo ?? null,
				customerWalletId: sale.customer?.walletId ?? null,
				po: (sale.meta as { po?: string | null } | null)?.po,
				date: sale.createdAt || new Date(),
				total: sale.grandTotal || 0,
				due: sale.amountDue || 0,
			} satisfies LoadedSale;
		})
		.filter((sale): sale is LoadedSale => sale !== null);
}

async function buildPaymentLink(db: Db, sales: LoadedSale[]) {
	const [primarySale] = sales;
	if (!primarySale) return null;

	const paymentEligibleSales = sales.filter((sale) => sale.due > 0);
	if (!paymentEligibleSales.length || primarySale.type === "quote") {
		return null;
	}

	const appUrl = getAppUrl();
	if (!appUrl) {
		throw new Error("Missing app URL for composed sales document email");
	}

	const expiry = addDays(new Date(), LINK_TTL_DAYS).toISOString();
	const accountNo =
		primarySale.customerPhone ||
		(primarySale.customerId ? `cust-${primarySale.customerId}` : null);
	const walletId =
		primarySale.customerWalletId ||
		(accountNo ? (await getCustomerWallet(db, accountNo)).id : null);
	if (!walletId) {
		throw new Error(
			`Missing walletId for composed sales document email, salesId=${primarySale.id}`,
		);
	}

	const paymentToken = tryTokenize({
		salesIds: paymentEligibleSales.map((sale) => sale.id),
		expiry,
		walletId,
	} satisfies SalesPaymentTokenSchema);

	return paymentToken ? `${appUrl}/checkout/${paymentToken}/v2` : null;
}

function buildPdfLink(sales: LoadedSale[], type: "order" | "quote") {
	const appUrl = getAppUrl();
	if (!appUrl) return null;

	const pdfToken = tryTokenize({
		salesIds: sales.map((sale) => sale.id),
		expiry: addDays(new Date(), LINK_TTL_DAYS).toISOString(),
		mode: type,
	} satisfies SalesPdfToken);

	return pdfToken
		? `${appUrl}/api/download/sales-v2?token=${encodeURIComponent(
				pdfToken,
			)}&preview=false`
		: null;
}

async function buildPdfAttachment(
	db: Db,
	sales: LoadedSale[],
	type: "order" | "quote",
) {
	const salesIds = sales.map((sale) => sale.id);
	try {
		return await buildSalesPdfAttachment(db, {
			salesIds,
			mode: type,
			templateId: DEFAULT_TEMPLATE_ID,
		});
	} catch (error) {
		logger.warn(
			"Failed to build sales PDF attachment; sending composed sales document email without attachment",
			{
				error,
				salesIds,
				mode: type,
			},
		);
		return null;
	}
}

async function buildComposedSalesDocumentEmailData(
	db: Db,
	input: ComposedSalesDocumentEmailInput,
) {
	const sales = await loadSales(db, input);
	if (!sales.length) {
		throw new Error(
			"No eligible sales found for composed sales document email",
		);
	}

	const [primarySale] = sales;
	if (!primarySale) {
		throw new Error(
			"No eligible sales found for composed sales document email",
		);
	}

	const hasMixedRecipients = sales.some(
		(sale) => sale.customerEmail !== primarySale.customerEmail,
	);
	if (hasMixedRecipients) {
		throw new Error(
			"composed_sales_document_email requires all sales to belong to one recipient",
		);
	}

	const type = input.printType === "quote" ? "quote" : "order";
	const paymentLink = await buildPaymentLink(db, sales);
	const pdfLink = buildPdfLink(sales, type);
	const pdfAttachment = shouldAttachSalesEmailPdf()
		? await buildPdfAttachment(db, sales, type)
		: null;

	return {
		type,
		customerEmail:
			normalizeText(input.customerEmail) || primarySale.customerEmail,
		customerName:
			normalizeText(input.customerName) ||
			primarySale.customerName ||
			"Customer",
		salesRep: primarySale.salesRep,
		salesRepEmail: primarySale.salesRepEmail,
		salesRepId: primarySale.salesRepId,
		subject: input.subject.trim(),
		message: normalizeText(input.message),
		paymentLink,
		pdfLink,
		salesIds: sales.map((sale) => sale.id),
		salesNos: sales.map((sale) => sale.orderId),
		emailAttemptId: input.emailAttemptId,
		sourceAttemptId: input.sourceAttemptId,
		sales: sales.map((sale) => ({
			orderId: sale.orderId,
			po: sale.po,
			date: sale.date,
			total: sale.total,
			due: sale.due,
		})),
		pdfAttachment,
	};
}

export const composedSalesDocumentEmail: NotificationHandler = {
	schema: resolvedSchema,
	createActivityWithoutContact: true,
	async extendData(db, data: ComposedSalesDocumentEmailInput) {
		return buildComposedSalesDocumentEmailData(db, data);
	},
	createDirectEmailContact(
		data: ResolvedComposedSalesDocumentEmailInput,
	): UserData {
		return {
			id: 0,
			profileId: 0,
			name: data.customerName,
			email: data.customerEmail,
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data: ResolvedComposedSalesDocumentEmailInput, author) {
		const docType = data.type === "quote" ? "Quote" : "Invoice";
		const payload: ComposedSalesDocumentEmailTags = {
			type: "composed_sales_document_email",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			salesCount: data.sales.length,
			reminderType: data.type,
			salesNo: data.sales.map((sale) => sale.orderId),
			emailSubject: data.subject,
			hasPaymentLink: Boolean(data.paymentLink),
			hasPdfLink: Boolean(data.pdfLink),
			hasPdfAttachment: Boolean(data.pdfAttachment),
		};

		return {
			type: "composed_sales_document_email",
			source: "system",
			subject: `${docType} email sent`,
			headline: `${docType} email sent to ${data.customerName} (${data.customerEmail}).`,
			authorId: author.id,
			note: data.message || undefined,
			tags: payload,
		};
	},
	createEmail(
		data: ResolvedComposedSalesDocumentEmailInput,
		_author,
		_user,
		args,
	) {
		return {
			...args,
			template: "composed-sales-document-email",
			to: [data.customerEmail],
			from: `GND Millwork <${data.salesRepEmail.split("@")[0]}@gndprodesk.com>`,
			replyTo: data.salesRepEmail,
			subject: data.subject,
			attachments: data.pdfAttachment ? [data.pdfAttachment] : undefined,
			data: {
				subject: data.subject,
				customerName: data.customerName,
				message: data.message || undefined,
				paymentLink: data.paymentLink || undefined,
				pdfLink: data.pdfLink || undefined,
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
