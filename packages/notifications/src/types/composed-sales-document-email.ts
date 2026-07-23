import type { Db } from "@gnd/db";
import { logger } from "@gnd/logger";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { getAppUrl } from "@gnd/utils/envs";
import {
	type SalesPaymentTokenSchema,
	type SalesPdfToken,
	tryTokenize,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { z } from "zod";
import type { NotificationHandler, UserData } from "../base";
import { normalizeCustomerPhoneNumber } from "../phone-number";
import {
	buildSalesDocumentChannelMessage,
	shortenSalesDocumentMessageLinks,
} from "../sales-document-message";
import {
	type ComposedSalesDocumentEmailInput,
	type ComposedSalesDocumentEmailTags,
	dealerProgramBannerSchema,
	salesDocumentDeliveryChannelsSchema,
	salesPdfAttachmentSchema,
} from "../schemas";
import { resolveSalesEmailDealerProgramBanner } from "./dealer-recruitment-banner";
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
	customerEmail: string | null;
	customerName: string;
	salesRep: string;
	salesRepEmail: string | null;
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
	customerEmail: z.string().email().optional().nullable(),
	customerPhone: z.string().optional().nullable(),
	customerName: z.string(),
	salesRep: z.string(),
	salesRepEmail: z.string().email().optional().nullable(),
	salesRepId: z.number().optional().nullable(),
	subject: z.string().min(1),
	message: z.string().optional().nullable(),
	channels: salesDocumentDeliveryChannelsSchema,
	paymentLink: z.string().optional().nullable(),
	pdfLink: z.string().optional().nullable(),
	acceptQuoteLink: z.string().optional().nullable(),
	channelMessage: z.string().min(1),
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
	dealerProgramBanner: dealerProgramBannerSchema.optional().nullable(),
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

			if (!customerName) {
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

export async function buildComposedSalesDocumentEmailData(
	db: Db,
	input: ComposedSalesDocumentEmailInput,
	author: UserData,
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

	const channels = input.channels || ["email"];
	const customerEmail =
		normalizeText(input.customerEmail) || primarySale.customerEmail;
	const customerPhone = normalizeCustomerPhoneNumber(
		normalizeText(input.customerPhone) || primarySale.customerPhone,
	);
	const hasMixedRecipients = sales.some((sale) => {
		if (
			channels.includes("email") &&
			sale.customerEmail !== primarySale.customerEmail
		) {
			return true;
		}
		if (
			(channels.includes("whatsapp") || channels.includes("sms")) &&
			normalizeCustomerPhoneNumber(sale.customerPhone) !==
				normalizeCustomerPhoneNumber(primarySale.customerPhone)
		) {
			return true;
		}
		return false;
	});
	if (hasMixedRecipients) {
		throw new Error(
			"composed_sales_document_email requires all sales to belong to one recipient",
		);
	}
	if (
		channels.includes("email") &&
		(!customerEmail || !primarySale.salesRepEmail)
	) {
		throw new Error(
			"Sales document email requires a customer email and sales rep email.",
		);
	}
	if (
		(channels.includes("whatsapp") || channels.includes("sms")) &&
		!customerPhone
	) {
		throw new Error(
			"Sales document WhatsApp or SMS delivery requires a valid customer phone.",
		);
	}

	const type = input.printType === "quote" ? "quote" : "order";
	const paymentLink = await buildPaymentLink(db, sales);
	const pdfLink = buildPdfLink(sales, type);
	const acceptQuoteLink =
		type !== "quote" || sales.length !== 1
			? null
			: (() => {
					const appUrl = getAppUrl();
					const token = tryTokenize({
						salesId: primarySale.id,
						orderId: primarySale.orderId,
						expiry: addDays(new Date(), 14).toISOString(),
					});
					return token && appUrl
						? `${appUrl}/sales/accept-quote/${primarySale.orderId}?token=${encodeURIComponent(
								token,
							)}`
						: null;
				})();
	const salesIds = sales.map((sale) => sale.id);
	const salesNos = sales.map((sale) => sale.orderId);
	const shortLinks = await shortenSalesDocumentMessageLinks(db, {
		type,
		salesIds,
		salesNos,
		pdfLink,
		paymentLink,
		acceptQuoteLink,
		expiresAt: addDays(new Date(), LINK_TTL_DAYS),
		acceptQuoteExpiresAt: addDays(new Date(), 14),
		createdById: author.id,
	});
	if (
		(channels.includes("whatsapp") || channels.includes("sms")) &&
		!shortLinks.pdfLink
	) {
		throw new Error("Sales document delivery requires a secure document link.");
	}
	const channelMessage = buildSalesDocumentChannelMessage({
		type,
		customerName:
			normalizeText(input.customerName) ||
			primarySale.customerName ||
			"Customer",
		salesNos,
		message: input.message,
		links: shortLinks,
	});
	const pdfAttachment = channels.includes("email")
		? await buildPdfAttachment(db, sales, type)
		: null;
	const dealerProgramBanner =
		channels.includes("email") && primarySale.customerId
			? await resolveSalesEmailDealerProgramBanner(db, {
					customerId: primarySale.customerId,
					customerEmail: customerEmail || "",
				})
			: null;

	return {
		type,
		customerEmail,
		customerPhone,
		customerName:
			normalizeText(input.customerName) ||
			primarySale.customerName ||
			"Customer",
		salesRep: primarySale.salesRep,
		salesRepEmail: primarySale.salesRepEmail,
		salesRepId: primarySale.salesRepId,
		subject: input.subject.trim(),
		message: normalizeText(input.message),
		channels,
		paymentLink: shortLinks.paymentLink,
		pdfLink: shortLinks.pdfLink,
		acceptQuoteLink: shortLinks.acceptQuoteLink,
		channelMessage,
		salesIds,
		salesNos,
		emailAttemptId: input.emailAttemptId,
		sourceAttemptId: input.sourceAttemptId,
		dealerProgramBanner,
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
	async extendData(db, data: ComposedSalesDocumentEmailInput, author) {
		return buildComposedSalesDocumentEmailData(db, data, author);
	},
	createDirectEmailContact(
		data: ResolvedComposedSalesDocumentEmailInput,
	): UserData | null {
		if (
			!(data.channels || ["email"]).includes("email") ||
			!data.customerEmail
		) {
			return null;
		}
		return {
			id: 0,
			profileId: 0,
			name: data.customerName,
			email: data.customerEmail,
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
			smsNotification: false,
		};
	},
	createDirectWhatsAppContact(
		data: ResolvedComposedSalesDocumentEmailInput,
	): UserData | null {
		if (
			!(data.channels || ["email"]).includes("whatsapp") ||
			!data.customerPhone
		) {
			return null;
		}
		return {
			id: 0,
			profileId: 0,
			name: data.customerName,
			phoneNo: data.customerPhone,
			role: "customer",
			emailNotification: false,
			inAppNotification: false,
			whatsAppNotification: true,
			smsNotification: false,
		};
	},
	createDirectSmsContact(
		data: ResolvedComposedSalesDocumentEmailInput,
	): UserData | null {
		if (!(data.channels || ["email"]).includes("sms") || !data.customerPhone) {
			return null;
		}
		return {
			id: 0,
			profileId: 0,
			name: data.customerName,
			phoneNo: data.customerPhone,
			role: "customer",
			emailNotification: false,
			inAppNotification: false,
			whatsAppNotification: false,
			smsNotification: true,
		};
	},
	createActivity(data: ResolvedComposedSalesDocumentEmailInput, author) {
		const docType = data.type === "quote" ? "Quote" : "Invoice";
		const channels = data.channels || ["email"];
		const payload: ComposedSalesDocumentEmailTags = {
			type: "composed_sales_document_email",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail || undefined,
			customerName: data.customerName,
			salesCount: data.sales.length,
			reminderType: data.type,
			salesNo: data.sales.map((sale) => sale.orderId),
			emailSubject: data.subject,
			hasPaymentLink: Boolean(data.paymentLink),
			hasPdfLink: Boolean(data.pdfLink),
			hasPdfAttachment: Boolean(data.pdfAttachment),
			hasAcceptQuoteLink: Boolean(data.acceptQuoteLink),
			requestedChannels: channels,
			customerPhone: data.customerPhone,
			dealerProgramCampaignId:
				data.dealerProgramBanner?.campaignId || undefined,
		};

		return {
			type: "composed_sales_document_email",
			source: "system",
			subject: `${docType} delivery requested`,
			headline: `${docType} delivery requested for ${data.customerName} by ${channels.join(", ")}.`,
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
		if (!data.customerEmail || !data.salesRepEmail) {
			throw new Error("Sales document email contact is unavailable.");
		}
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
	createWhatsApp(data: ResolvedComposedSalesDocumentEmailInput) {
		return {
			message: data.channelMessage,
		};
	},
	createSms(data: ResolvedComposedSalesDocumentEmailInput) {
		return {
			message: data.channelMessage,
		};
	},
};
