import type { Db } from "@gnd/db";
import { getAppApiUrl } from "@gnd/utils/envs";
import { type SalesPdfToken, tryTokenize } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import {
	salesCustomerPaymentFailedSchema,
	salesCustomerPaymentReceivedSchema,
} from "../schemas";

function normalizeText(value: string | null | undefined) {
	return value?.trim() || null;
}

type SaleInput = {
	salesId: number;
	amountApplied?: number | null;
	remainingDue?: number | null;
};

type LoadedSale = {
	id: number;
	orderNo: string;
	customerEmail: string;
	customerName: string;
	remainingDue: number;
};

async function loadSales(db: Db, sales: SaleInput[]) {
	const salesIds = Array.from(new Set(sales.map((sale) => sale.salesId)));
	if (!salesIds.length) {
		throw new Error("No sales were supplied for payment notification");
	}

	const orders = await db.salesOrders.findMany({
		where: {
			id: {
				in: salesIds,
			},
		},
		select: {
			id: true,
			orderId: true,
			amountDue: true,
			customer: {
				select: {
					email: true,
					name: true,
					businessName: true,
				},
			},
			billingAddress: {
				select: {
					email: true,
					name: true,
				},
			},
		},
	});

	const orderMap = new Map(
		orders.map((order) => {
			const customerEmail =
				normalizeText(order.customer?.email) ||
				normalizeText(order.billingAddress?.email);
			const customerName =
				normalizeText(order.customer?.businessName) ||
				normalizeText(order.customer?.name) ||
				normalizeText(order.billingAddress?.name);
			const loaded =
				customerEmail && customerName
					? ({
							id: order.id,
							orderNo: order.orderId,
							customerEmail,
							customerName,
							remainingDue: Number(order.amountDue || 0),
						} satisfies LoadedSale)
					: null;
			return [order.id, loaded] as const;
		}),
	);

	const resolved = sales
		.map((sale) => {
			const order = orderMap.get(sale.salesId);
			if (!order) return null;
			return {
				...sale,
				...order,
			};
		})
		.filter(
			(
				sale,
			): sale is SaleInput &
				LoadedSale => sale !== null,
		);

	if (!resolved.length) {
		throw new Error("No eligible sales were found for customer payment email");
	}

	const [primarySale] = resolved;
	if (!primarySale) {
		throw new Error("No eligible sales were found for customer payment email");
	}

	const hasMixedRecipients = resolved.some(
		(sale) =>
			sale.customerEmail !== primarySale.customerEmail ||
			sale.customerName !== primarySale.customerName,
	);
	if (hasMixedRecipients) {
		throw new Error(
			"Customer payment notifications require all sales to belong to one recipient",
		);
	}

	return {
		customerEmail: primarySale.customerEmail,
		customerName: primarySale.customerName,
		sales: resolved,
	};
}

function buildInvoiceDownloadUrl(salesIds: number[]) {
	const apiUrl = getAppApiUrl();
	const token = tryTokenize({
		salesIds,
		expiry: addDays(new Date(), 7).toISOString(),
		mode: "invoice",
	} satisfies SalesPdfToken);

	return token && apiUrl
		? `${apiUrl}/download/sales?token=${encodeURIComponent(token)}&download=true`
		: null;
}

export async function buildSalesCustomerPaymentReceivedPayload(
	db: Db,
	input: {
		sales: SaleInput[];
		paymentMethod: string;
		totalAmount: number;
		note?: string | null;
	},
) {
	const resolved = await loadSales(db, input.sales);

	return salesCustomerPaymentReceivedSchema.parse({
		customerEmail: resolved.customerEmail,
		customerName: resolved.customerName,
		paymentMethod: input.paymentMethod,
		totalAmount: Number(input.totalAmount || 0),
		note: normalizeText(input.note),
		invoiceDownloadUrl: buildInvoiceDownloadUrl(
			resolved.sales.map((sale) => sale.id),
		),
		sales: resolved.sales.map((sale) => ({
			salesId: sale.id,
			orderNo: sale.orderNo,
			amountApplied:
				sale.amountApplied == null ? null : Number(sale.amountApplied || 0),
			remainingDue:
				sale.remainingDue == null
					? Number(sale.remainingDue || 0)
					: Number(sale.remainingDue || 0),
		})),
	});
}

export async function buildSalesCustomerPaymentFailedPayload(
	db: Db,
	input: {
		sales: SaleInput[];
		paymentMethod?: string | null;
		totalAmount?: number | null;
		reason?: string | null;
	},
) {
	const resolved = await loadSales(db, input.sales);

	return salesCustomerPaymentFailedSchema.parse({
		customerEmail: resolved.customerEmail,
		customerName: resolved.customerName,
		paymentMethod: normalizeText(input.paymentMethod),
		totalAmount:
			input.totalAmount == null ? null : Number(input.totalAmount || 0),
		reason: normalizeText(input.reason),
		sales: resolved.sales.map((sale) => ({
			salesId: sale.id,
			orderNo: sale.orderNo,
			remainingDue:
				sale.remainingDue == null
					? Number(sale.remainingDue || 0)
					: Number(sale.remainingDue || 0),
		})),
	});
}
