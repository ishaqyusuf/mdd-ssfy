import type { Db } from "@gnd/db";
import { buildShortUrl, findOrCreateShortLinkForTarget } from "@gnd/db/queries";
import type { CustomerStatementPdfData } from "@gnd/pdf/customer-statement";
import { resolveSalesCompanyAddress } from "@gnd/sales/print";
import {
	type CustomerStatementPdfToken,
	type SalesPaymentTokenSchema,
	tryTokenize,
} from "@gnd/utils/tokenizer";
import { getAppUrl } from "@gnd/utils/envs";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { TRPCError } from "@trpc/server";
import { addDays, format } from "date-fns";

const CUSTOMER_STATEMENT_PAYMENT_SOURCE_TYPE = "customer_statement_payment";

function formatStatementDate(value?: Date | string | null) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return format(date, "MM/dd/yy");
}

export async function getCustomerStatementPrintData(
	db: Db,
	query: Pick<CustomerStatementPdfToken, "customerId" | "salesIds">,
): Promise<CustomerStatementPdfData> {
	const selectedSalesIds = Array.from(new Set(query.salesIds)).filter((id) =>
		Number.isFinite(id),
	);

	if (!selectedSalesIds.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Select at least one order for this statement.",
		});
	}

	const customer = await db.customers.findUnique({
		where: {
			id: query.customerId,
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			phoneNo2: true,
			address: true,
			addressBooks: {
				where: {
					deletedAt: null,
				},
				orderBy: [
					{
						isPrimary: "desc",
					},
					{
						createdAt: "desc",
					},
				],
				take: 1,
				select: {
					address1: true,
					address2: true,
					city: true,
					state: true,
					email: true,
				},
			},
		},
	});

	if (!customer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Customer not found.",
		});
	}

	const orders = await db.salesOrders.findMany({
		where: {
			id: {
				in: selectedSalesIds,
			},
			deletedAt: null,
			type: "order",
			customerId: query.customerId,
			amountDue: {
				gt: 0,
			},
		},
		select: {
			id: true,
			orderId: true,
			createdAt: true,
			grandTotal: true,
			amountDue: true,
			billingAddress: {
				select: {
					address1: true,
				},
			},
			shippingAddress: {
				select: {
					address1: true,
				},
			},
		},
	});
	const salesOrderRank = new Map(
		selectedSalesIds.map((salesId, index) => [salesId, index]),
	);
	orders.sort(
		(a, b) =>
			(salesOrderRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
			(salesOrderRank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
	);

	if (!orders.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No open selected orders were found for this customer.",
		});
	}

	const accountNo = customer.phoneNo || `cust-${customer.id}`;
	const primaryAddress = customer.addressBooks[0] || null;
	const customerName = customer.businessName || customer.name || "Customer";
	const customerEmail = customer.email || primaryAddress?.email || "";
	const customerAddress =
		[
			primaryAddress?.address1 || customer.address,
			primaryAddress?.address2,
			primaryAddress?.city,
			primaryAddress?.state,
		]
			.filter(Boolean)
			.join(", ") || null;
	const wallet = await getCustomerWallet(db, accountNo);
	const paymentExpiry = addDays(new Date(), 7).toISOString();
	const paymentToken =
		wallet?.id && orders.length
			? tryTokenize({
					salesIds: orders.map((order) => order.id),
					expiry: paymentExpiry,
					payPlan: "full",
					walletId: wallet.id,
					amount: null,
				} satisfies SalesPaymentTokenSchema)
			: null;
	const lines = orders.map((order) => {
		const invoice = Number(order.grandTotal || 0);
		const pending = Number(order.amountDue || 0);
		const paid = Math.max(invoice - pending, 0);

		return {
			salesId: order.id,
			orderNo: order.orderId || `#${order.id}`,
			date: formatStatementDate(order.createdAt),
			address:
				order.billingAddress?.address1 ||
				order.shippingAddress?.address1 ||
				customerAddress,
			invoice,
			paid,
			pending,
		};
	});
	const invoiceTotal = lines.reduce((total, line) => total + line.invoice, 0);
	const paidTotal = lines.reduce((total, line) => total + line.paid, 0);
	const balanceDue = lines.reduce((total, line) => total + line.pending, 0);
	const firstOrderId = orders[0]?.orderId || null;
	const directPaymentLink =
		paymentToken && getAppUrl()
			? `${getAppUrl()}/checkout/${paymentToken}/v2`
			: null;
	const paymentLink = directPaymentLink
		? await createCustomerStatementPaymentShortLink(db, {
				customerId: customer.id,
				customerName,
				salesIds: orders.map((order) => order.id),
				targetUrl: directPaymentLink,
				expiresAt: paymentExpiry,
			})
		: null;

	return {
		title: `Customer Statement - ${customerName}`,
		printedAt: new Date(),
		customer: {
			id: customer.id,
			displayName: customerName,
			email: customerEmail,
			phoneNo: customer.phoneNo,
			phoneNo2: customer.phoneNo2,
			accountNo,
			address: customerAddress,
		},
		companyAddress: resolveSalesCompanyAddress(firstOrderId),
		logoUrl: null,
		paymentLink,
		summary: {
			orderCount: lines.length,
			invoiceTotal,
			paidTotal,
			balanceDue,
		},
		lines,
	};
}

async function createCustomerStatementPaymentShortLink(
	db: Db,
	input: {
		customerId: number;
		customerName: string;
		salesIds: number[];
		targetUrl: string;
		expiresAt: string;
	},
) {
	const sortedSalesIds = [...input.salesIds].sort((a, b) => a - b);
	const sourceId = `${input.customerId}:${sortedSalesIds.join(",")}`;

	try {
		const shortLink = await findOrCreateShortLinkForTarget(db, {
			targetUrl: input.targetUrl,
			title: `${input.customerName} statement payment`,
			sourceType: CUSTOMER_STATEMENT_PAYMENT_SOURCE_TYPE,
			sourceId,
			expiresAt: input.expiresAt,
			meta: {
				kind: "customer_statement_payment",
				customerId: input.customerId,
				salesIds: sortedSalesIds,
			},
		});

		return buildShortUrl(shortLink.slug, getAppUrl());
	} catch {
		return input.targetUrl;
	}
}
