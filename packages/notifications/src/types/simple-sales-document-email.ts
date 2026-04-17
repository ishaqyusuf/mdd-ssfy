import type { Db } from "@gnd/db";
import { getAppApiUrl, getAppUrl } from "@gnd/utils/envs";
import { getCustomerWallet } from "@gnd/sales/wallet";
import {
	type SalesPaymentTokenSchema,
	type SalesPdfToken,
	tryTokenize,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { z } from "zod";
import type { NotificationHandler, UserData } from "../base";
import {
	type SalesEmailReminderInput,
	type SalesEmailReminderTags,
	type SendSalesEmailPayloadInput,
	salesEmailReminderSchema,
} from "../schemas";

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
	customerId: number | null;
	customerPhone: string | null;
	customerWalletId: number | null;
	po: string | null | undefined;
	date: Date;
	total: number;
	due: number;
};

async function loadSales(db: Db, input: SendSalesEmailPayloadInput) {
	const { salesIds, salesNos } = input;

	if (!salesIds?.length && !salesNos?.length) {
		throw new Error("Invalid sales information");
	}

	const sales = await db.salesOrders.findMany({
		where: {
			id: salesIds?.length ? { in: salesIds } : undefined,
			orderId: salesNos?.length ? { in: salesNos } : undefined,
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
				normalizeText(sale.billingAddress?.email);
			const customerName =
				normalizeText(sale.customer?.name) ||
				normalizeText(sale.customer?.businessName) ||
				normalizeText(sale.billingAddress?.name);
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

async function buildSalesDocumentEmailData(
	db: Db,
	input: SendSalesEmailPayloadInput,
) {
	const sales = await loadSales(db, input);

	if (!sales.length) {
		throw new Error("No eligible sales found for document email");
	}

	const [primarySale] = sales;
	if (!primarySale) {
		throw new Error("No eligible sales found for document email");
	}

	const hasMixedRecipients = sales.some(
		(sale) => sale.customerEmail !== primarySale.customerEmail,
	);
	if (hasMixedRecipients) {
		throw new Error(
			"simple_sales_document_email requires all sales to belong to one recipient",
		);
	}

	const appUrl = getAppUrl();
	const apiUrl = getAppApiUrl();
	const expiry = addDays(new Date(), 7).toISOString();
	const pdfToken = tryTokenize({
		salesIds: sales.map((sale) => sale.id),
		expiry,
		mode: input.printType,
	} satisfies SalesPdfToken);
	const paymentEligibleSales = sales.filter((sale) => sale.due > 0);
	const paymentLink =
		input.printType === "quote" || !paymentEligibleSales.length
			? null
			: await (async () => {
					const accountNo =
						primarySale.customerPhone ||
						(primarySale.customerId
							? `cust-${primarySale.customerId}`
							: null);
					const walletId =
						primarySale.customerWalletId ||
						(accountNo ? (await getCustomerWallet(db, accountNo)).id : null);
					if (!walletId) {
						throw new Error(
							`Missing walletId for document email, salesId=${primarySale.id}`,
						);
					}
					const paymentToken = tryTokenize({
						salesIds: paymentEligibleSales.map((sale) => sale.id),
						expiry,
						walletId,
					} satisfies SalesPaymentTokenSchema);
					return paymentToken && appUrl
						? `${appUrl}/checkout/${paymentToken}/v2`
						: null;
				})();
	const acceptQuoteLink =
		input.printType !== "quote" || sales.length !== 1
			? null
			: (() => {
					const quoteToken = tryTokenize({
						salesId: primarySale.id,
						orderId: primarySale.orderId,
						expiry: addDays(new Date(), 14).toISOString(),
					});

					return quoteToken
						? `${appUrl}/sales/accept-quote/${primarySale.orderId}?token=${encodeURIComponent(
								quoteToken,
							)}`
						: null;
				})();

	return {
		type: input.printType,
		customerEmail: primarySale.customerEmail,
		customerName: primarySale.customerName,
		salesRep: primarySale.salesRep,
		salesRepEmail: primarySale.salesRepEmail,
		paymentLink,
		pdfLink:
			pdfToken && apiUrl != null
				? `${apiUrl}/download/sales?token=${encodeURIComponent(pdfToken)}&download=true`
				: null,
		acceptQuoteLink,
		sales: sales.map((sale) => ({
			orderId: sale.orderId,
			po: sale.po,
			date: sale.date,
			total: sale.total,
			due: sale.due,
		})),
	};
}

const resolvedSchema = salesEmailReminderSchema.extend({
	acceptQuoteLink: z.string().optional().nullable(),
});

type ResolvedSalesDocumentEmailInput = SalesEmailReminderInput & {
	acceptQuoteLink?: string | null;
};

export const simpleSalesDocumentEmail: NotificationHandler = {
	schema: resolvedSchema,
	createActivityWithoutContact: true,
	async extendData(db, data: SendSalesEmailPayloadInput, _author: UserData) {
		return buildSalesDocumentEmailData(db, data);
	},
	createActivity(data: ResolvedSalesDocumentEmailInput, author) {
		const docType = data.type === "quote" ? "Quote" : "Invoice";
		const payload: SalesEmailReminderTags = {
			type: "simple_sales_document_email",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			salesCount: data.sales.length,
			reminderType: data.type,
			salesNo: data.sales.map((sale) => sale.orderId),
			hasPaymentLink: Boolean(data.paymentLink),
			hasPdfLink: Boolean(data.pdfLink),
		};

		return {
			type: "simple_sales_document_email",
			source: "system",
			subject: `${docType} email sent`,
			headline: `${docType} email sent to ${data.customerName} (${data.customerEmail}) for ${data.sales.length} document${data.sales.length > 1 ? "s" : ""}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data: ResolvedSalesDocumentEmailInput, _author, _user, args) {
		const isQuote = data.type === "quote";

		return {
			...args,
			template: "sales-email-reminder",
			to: [data.customerEmail],
			from: `GND Millwork <${data.salesRepEmail.split("@")[0]}@gndprodesk.com>`,
			subject: `${data.salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
			data: {
				isQuote,
				customerName: data.customerName,
				acceptQuoteLink: data.acceptQuoteLink || undefined,
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
