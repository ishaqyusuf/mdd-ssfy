import type { Db, TransactionClient } from "@gnd/db";

import { roundMoney } from "../payment-system/domain/money";
import { resolveSalesTaxRecognitionEvidence } from "./recognition-evidence";

type TaxRecognitionDb = Db | TransactionClient;

type TaxRow = {
	taxCode: string;
	taxxable: number | null;
	tax: number | null;
};

export type SalesTaxRecognitionSnapshotInput = {
	orderNo: string;
	customerName: string;
	subTotal: number | null;
	grandTotal: number | null;
	tax: number | null;
	taxes: TaxRow[];
};

export type SalesTaxRecognitionSnapshot = {
	orderNo: string;
	customerName: string;
	invoiceTotalCents: number;
	grossSalesCents: number;
	exemptSalesCents: number;
	taxableAmountCents: number;
	stateTaxCents: number;
	surtaxCents: number;
	taxDueCents: number;
	taxCode: string | null;
};

export type RecognizeSalesTaxInput = {
	salesOrderId: number;
	recognizedAt?: Date;
	source?: "DELIVERY" | "PICKUP" | "ORDER_STATUS" | "MANUAL_BACKFILL";
	sourceId?: string | number | null;
	createdById?: number | null;
	reason?: string | null;
};

export function toSalesTaxCents(value: number | null | undefined) {
	return Math.round(roundMoney(value) * 100);
}

export function buildSalesTaxRecognitionSnapshot(
	input: SalesTaxRecognitionSnapshotInput,
): SalesTaxRecognitionSnapshot {
	const activeTaxes = input.taxes.filter(
		(row) =>
			Number.isFinite(Number(row.taxxable)) || Number.isFinite(Number(row.tax)),
	);
	const rowTaxTotal = activeTaxes.reduce(
		(total, row) => total + Number(row.tax ?? 0),
		0,
	);
	const taxDue = input.tax == null ? rowTaxTotal : Number(input.tax);
	const surtax = activeTaxes
		.filter((row) => row.taxCode.toUpperCase() === "A")
		.reduce((total, row) => total + Number(row.tax ?? 0), 0);
	const stateTax = Math.max(0, taxDue - surtax);
	const taxableAmount = activeTaxes.reduce(
		(maximum, row) => Math.max(maximum, Number(row.taxxable ?? 0)),
		0,
	);
	const invoiceTotal = Number(input.grandTotal ?? 0);
	const grossSales = Number(
		input.subTotal ?? Math.max(0, invoiceTotal - taxDue),
	);

	return {
		orderNo: input.orderNo,
		customerName: input.customerName,
		invoiceTotalCents: toSalesTaxCents(invoiceTotal),
		grossSalesCents: toSalesTaxCents(grossSales),
		exemptSalesCents: toSalesTaxCents(Math.max(0, grossSales - taxableAmount)),
		taxableAmountCents: toSalesTaxCents(taxableAmount),
		stateTaxCents: toSalesTaxCents(stateTax),
		surtaxCents: toSalesTaxCents(surtax),
		taxDueCents: toSalesTaxCents(taxDue),
		taxCode:
			activeTaxes
				.map((row) => row.taxCode)
				.filter(Boolean)
				.sort()
				.join(",") || null,
	};
}

export async function recognizeSalesTaxForFulfilledOrder(
	db: TaxRecognitionDb,
	input: RecognizeSalesTaxInput,
) {
	const sourceKey = `sale:${input.salesOrderId}:initial`;
	const existing = await db.salesTaxLedgerEntry.findUnique({
		where: { sourceKey },
		select: { id: true, recognizedAt: true },
	});
	if (existing) {
		return { status: "already_recognized" as const, entry: existing };
	}

	const order = await db.salesOrders.findFirst({
		where: {
			id: input.salesOrderId,
			deletedAt: null,
			type: "order",
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			deliveredAt: true,
			subTotal: true,
			grandTotal: true,
			tax: true,
			customer: { select: { businessName: true, name: true } },
			billingAddress: { select: { name: true } },
			pickup: { select: { id: true, pickupAt: true, deletedAt: true } },
			taxes: {
				where: { deletedAt: null },
				select: { taxCode: true, taxxable: true, tax: true },
			},
			stat: {
				where: { type: "dispatchCompleted", deletedAt: null },
				select: { percentage: true },
			},
			deliveries: {
				where: {
					deletedAt: null,
					status: { in: ["completed", "delivered"] },
					deliveredAt: { not: null },
				},
				orderBy: [{ deliveredAt: "desc" }, { id: "desc" }],
				take: 1,
				select: { id: true, deliveryMode: true, deliveredAt: true },
			},
		},
	});

	if (!order) return { status: "not_recognizable" as const, reason: "order" };
	const resolution = resolveSalesTaxRecognitionEvidence({
		orderId: order.id,
		status: order.status,
		dispatchCompletedPercentage: order.stat.reduce(
			(maximum, row) => Math.max(maximum, Number(row.percentage ?? 0)),
			0,
		),
		deliveredAt: order.deliveredAt,
		pickup: order.pickup,
		deliveries: order.deliveries,
	});
	if (resolution.status === "ineligible") {
		return { status: "not_recognizable" as const, reason: resolution.reason };
	}
	const recognizedAt = input.recognizedAt ?? resolution.evidence.recognizedAt;
	const source = input.source ?? resolution.evidence.source;
	const snapshot = buildSalesTaxRecognitionSnapshot({
		orderNo: order.orderId,
		customerName:
			order.customer?.businessName ||
			order.customer?.name ||
			order.billingAddress?.name ||
			"Walk-in customer",
		subTotal: order.subTotal,
		grandTotal: order.grandTotal,
		tax: order.tax,
		taxes: order.taxes,
	});

	const entry = await db.salesTaxLedgerEntry.upsert({
		where: { sourceKey },
		create: {
			salesOrderId: order.id,
			entryType: "SALE",
			recognitionSource: source,
			sourceKey,
			sourceType:
				resolution.evidence.source === "DELIVERY"
					? "OrderDelivery"
					: resolution.evidence.source === "PICKUP"
						? "SalesPickup"
						: "SalesOrders",
			sourceId: String(input.sourceId ?? resolution.evidence.sourceId),
			recognizedAt,
			...snapshot,
			createdById: input.createdById ?? null,
			reason: input.reason ?? null,
			meta: {
				policy: "florida-fulfilled-sale-v1",
				paymentIndependent: true,
			},
		},
		update: {},
		select: { id: true, recognizedAt: true },
	});

	return { status: "recognized" as const, entry };
}
