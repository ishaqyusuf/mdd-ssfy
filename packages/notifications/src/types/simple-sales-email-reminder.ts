import type { Db } from "@gnd/db";
import {
	type ReminderPayPlan,
	SALES_REMINDER_EXPIRY_DAYS,
	resolveReminderAmount,
	resolveReminderPlanLabel,
} from "@gnd/sales/utils";
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
import {
	type SalesEmailReminderInput,
	type SimpleSalesEmailReminderInput,
	type SimpleSalesEmailReminderTags,
	salesEmailReminderSchema,
	salesPdfAttachmentSchema,
} from "../schemas";
import { salesEmailReminder } from "./sales-email-reminder";
import { buildSalesPdfAttachmentFromToken } from "./sales-pdf-attachment";
import { resolveSalesEmailDealerProgramBanner } from "./dealer-recruitment-banner";

const simpleSalesEmailReminderResolvedSchema = salesEmailReminderSchema.extend({
	salesId: z.number(),
	payPlan: z
		.union([
			z.number(),
			z.literal("full"),
			z.literal("custom"),
			z.literal("flexible"),
		])
		.optional()
		.nullable(),
	preferredAmount: z.number().optional().nullable(),
	attachInvoice: z.boolean().optional(),
	paymentLabel: z.string().optional().nullable(),
	pdfAttachment: salesPdfAttachmentSchema.optional().nullable(),
});

type SimpleSalesEmailReminderResolvedInput = z.infer<
	typeof simpleSalesEmailReminderResolvedSchema
>;

function resolveBaseUrls() {
	const appUrl = getAppUrl();
	return { appUrl };
}

async function buildReminderData(
	db: Db,
	input: SimpleSalesEmailReminderInput,
	author: UserData,
): Promise<SimpleSalesEmailReminderResolvedInput> {
	const sale = await db.salesOrders.findFirstOrThrow({
		where: { id: input.salesId },
		select: {
			id: true,
			type: true,
			orderId: true,
			meta: true,
			amountDue: true,
			grandTotal: true,
			createdAt: true,
			customer: {
				select: {
					id: true,
					name: true,
					email: true,
					phoneNo: true,
					walletId: true,
				},
			},
			billingAddress: {
				select: {
					name: true,
					email: true,
				},
			},
			salesRep: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	const customerEmail = sale.customer?.email || sale.billingAddress?.email;
	if (!customerEmail) {
		throw new Error(
			`Missing customer email for simple sales reminder, salesId=${input.salesId}`,
		);
	}
	const customerName =
		sale.customer?.name || sale.billingAddress?.name || "Customer";
	const saleType = sale.type === "quote" ? "quote" : "order";
	const salesRepName = sale.salesRep?.name || author.name || "Sales Rep";
	const salesRepEmail = sale.salesRep?.email || author.email;
	if (!salesRepEmail) {
		throw new Error(
			`Missing sales rep email for simple sales reminder, salesId=${input.salesId}`,
		);
	}

	const { appUrl } = resolveBaseUrls();
	const expiry = addDays(new Date(), SALES_REMINDER_EXPIRY_DAYS).toISOString();
	const pdfToken = input.attachInvoice
		? tryTokenize({
				salesIds: [sale.id],
				expiry,
				mode: saleType,
			} satisfies SalesPdfToken)
		: null;

	let paymentToken: string | null = null;
	const amount = resolveReminderAmount({
		due: sale.amountDue || 0,
		payPlan: input.payPlan as ReminderPayPlan | null | undefined,
		preferredAmount: input.preferredAmount,
	});

	if (input.payPlan === "custom" && amount <= 0) {
		throw new Error(
			`Invalid preferredAmount for custom payment reminder, salesId=${input.salesId}`,
		);
	}

	if (amount > 0 || input.payPlan === "flexible") {
		const accountNo =
			sale.customer?.phoneNo ||
			(sale.customer?.id ? `cust-${sale.customer.id}` : null);
		const walletId =
			sale.customer?.walletId ||
			(accountNo ? (await getCustomerWallet(db, accountNo)).id : null);
		if (!walletId) {
			throw new Error(
				`Missing walletId for payment reminder, salesId=${input.salesId}`,
			);
		}
		paymentToken = tryTokenize({
			salesIds: [sale.id],
			expiry,
			percentage: typeof input.payPlan === "number" ? input.payPlan : null,
			payPlan: input.payPlan,
			preferredAmount: input.preferredAmount,
			amount: amount > 0 ? amount : null,
			walletId,
		} satisfies SalesPaymentTokenSchema);
	}
	const dealerProgramBanner = sale.customer?.id
		? await resolveSalesEmailDealerProgramBanner(db, {
				customerId: sale.customer.id,
				customerEmail,
			})
		: null;

	return {
		salesId: sale.id,
		payPlan: input.payPlan ?? null,
		preferredAmount: input.preferredAmount ?? null,
		attachInvoice: input.attachInvoice,
		note: input.note || undefined,
		paymentLabel: resolveReminderPlanLabel({
			payPlan: input.payPlan as ReminderPayPlan | null | undefined,
			preferredAmount: input.preferredAmount,
			amount,
		}),
		type: saleType,
		customerEmail,
		customerName,
		salesRep: salesRepName,
		salesRepEmail,
		paymentToken,
		pdfToken,
		paymentLink:
			paymentToken && appUrl ? `${appUrl}/checkout/${paymentToken}/v2` : null,
		pdfLink: null,
		pdfAttachment: pdfToken
			? await buildSalesPdfAttachmentFromToken(db, pdfToken)
			: null,
		dealerProgramBanner,
		sales: [
			{
				orderId: sale.orderId,
				po: (sale.meta as { po?: string | null } | null)?.po,
				date: sale.createdAt || new Date(),
				total: sale.grandTotal || 0,
				due: sale.amountDue || 0,
			},
		],
	};
}

export const simpleSalesEmailReminder: NotificationHandler = {
	schema: simpleSalesEmailReminderResolvedSchema,
	createActivityWithoutContact: true,
	async extendData(db, data: SimpleSalesEmailReminderInput, author: UserData) {
		return buildReminderData(db, data, author);
	},
	createActivity: salesEmailReminder.createActivity,
	createEmail(data: SalesEmailReminderInput, author, user, args) {
		if (!salesEmailReminder.createEmail) {
			throw new Error("salesEmailReminder.createEmail is not configured");
		}
		return salesEmailReminder.createEmail(data, author, user, args);
	},
};
