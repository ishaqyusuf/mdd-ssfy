import type { Db } from "@gnd/db";

export const DAILY_PAYMENT_METHODS = [
	"card",
	"check",
	"zelle",
	"cash",
	"unclassified",
] as const;

export type DailyPaymentMethod = (typeof DAILY_PAYMENT_METHODS)[number];

export type DailyPaymentsReportInput = {
	from: Date;
	to: Date;
	timezone: string;
};

export type DailyPaymentsReportPaymentRow = {
	receivedAt: Date;
	orderNo: string;
	customer: string;
	paymentMethod: DailyPaymentMethod;
	rawPaymentMethod: string | null;
	amount: number;
	reference: string | null;
	recordedBy: string;
	status: string;
	notes: string | null;
	salesPaymentId: number;
	salesOrderId: number;
};

export type DailyPaymentsReportMethodTotal = {
	paymentMethod: DailyPaymentMethod;
	count: number;
	grossReceived: number;
	refunds: number;
	netReceived: number;
};

export type DailyPaymentsReportException = {
	issue: string;
	orderNo: string;
	customer: string;
	amount: number;
	currentValue: string | null;
	neededAction: string;
};

export type DailyPaymentsReport = {
	timezone: string;
	periodStart: Date;
	periodEnd: Date;
	totalPaymentsReceived: number;
	totalRefunds: number;
	netReceived: number;
	paymentCount: number;
	methodTotals: DailyPaymentsReportMethodTotal[];
	payments: DailyPaymentsReportPaymentRow[];
	exceptions: DailyPaymentsReportException[];
	generatedAt: Date;
};

function roundMoney(value: number) {
	return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizePaymentMethod(value?: string | null): DailyPaymentMethod {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();

	if (
		["card", "credit-card", "credit card", "terminal", "link"].includes(
			normalized,
		)
	) {
		return "card";
	}
	if (normalized === "check" || normalized === "cheque") return "check";
	if (normalized === "zelle") return "zelle";
	if (normalized === "cash") return "cash";

	return "unclassified";
}

function customerName(input: {
	customer?: { name?: string | null; businessName?: string | null } | null;
	billingAddress?: { name?: string | null } | null;
}) {
	return (
		input.customer?.businessName?.trim() ||
		input.customer?.name?.trim() ||
		input.billingAddress?.name?.trim() ||
		"Customer"
	);
}

function referenceFromMeta(meta: unknown, fallback?: string | null) {
	const record =
		meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
	const candidate =
		record.checkNo ||
		record.reference ||
		record.confirmation ||
		record.confirmationNo ||
		record.transactionId ||
		fallback;

	return candidate ? String(candidate) : null;
}

export async function buildDailyPaymentsReport(
	db: Db,
	input: DailyPaymentsReportInput,
): Promise<DailyPaymentsReport> {
	const rows = await db.salesPayments.findMany({
		where: {
			deletedAt: null,
			createdAt: {
				gte: input.from,
				lte: input.to,
			},
			status: {
				in: ["success", "completed", "paid"],
			},
		},
		orderBy: {
			createdAt: "asc",
		},
		select: {
			id: true,
			amount: true,
			status: true,
			note: true,
			meta: true,
			createdAt: true,
			orderId: true,
			squarePaymentsId: true,
			author: {
				select: {
					name: true,
					email: true,
				},
			},
			transaction: {
				select: {
					paymentMethod: true,
					txId: true,
					meta: true,
					author: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
			squarePayments: {
				select: {
					paymentMethod: true,
					paymentId: true,
					squareOrderId: true,
					createdBy: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
			order: {
				select: {
					id: true,
					orderId: true,
					customer: {
						select: {
							name: true,
							businessName: true,
						},
					},
					billingAddress: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	const payments: DailyPaymentsReportPaymentRow[] = rows.map((row) => {
		const rawPaymentMethod =
			row.transaction?.paymentMethod ||
			row.squarePayments?.paymentMethod ||
			null;
		const paymentMethod = normalizePaymentMethod(rawPaymentMethod);
		const reference =
			referenceFromMeta(row.meta, row.squarePayments?.paymentId) ||
			referenceFromMeta(row.transaction?.meta, row.transaction?.txId) ||
			row.squarePayments?.squareOrderId ||
			row.squarePaymentsId ||
			null;

		return {
			receivedAt: row.createdAt || input.from,
			orderNo: row.order.orderId,
			customer: customerName(row.order),
			paymentMethod,
			rawPaymentMethod,
			amount: roundMoney(row.amount || 0),
			reference,
			recordedBy:
				row.author?.name ||
				row.author?.email ||
				row.transaction?.author?.name ||
				row.transaction?.author?.email ||
				row.squarePayments?.createdBy?.name ||
				row.squarePayments?.createdBy?.email ||
				"System",
			status: row.status || "",
			notes: row.note || null,
			salesPaymentId: row.id,
			salesOrderId: row.orderId,
		};
	});

	const methodTotals = DAILY_PAYMENT_METHODS.map((paymentMethod) => {
		const methodRows = payments.filter(
			(row) => row.paymentMethod === paymentMethod,
		);
		const grossReceived = roundMoney(
			methodRows
				.filter((row) => row.amount > 0)
				.reduce((sum, row) => sum + row.amount, 0),
		);
		const refunds = roundMoney(
			methodRows
				.filter((row) => row.amount < 0)
				.reduce((sum, row) => sum + Math.abs(row.amount), 0),
		);

		return {
			paymentMethod,
			count: methodRows.length,
			grossReceived,
			refunds,
			netReceived: roundMoney(grossReceived - refunds),
		};
	});

	const exceptions: DailyPaymentsReportException[] = payments.flatMap((row) => {
		const items: DailyPaymentsReportException[] = [];
		if (row.paymentMethod === "unclassified") {
			items.push({
				issue: "Missing or unknown payment method",
				orderNo: row.orderNo,
				customer: row.customer,
				amount: row.amount,
				currentValue: row.rawPaymentMethod,
				neededAction: "Assign Card, Check, Zelle, or Cash",
			});
		}
		if (row.paymentMethod === "check" && !row.reference) {
			items.push({
				issue: "Missing check reference",
				orderNo: row.orderNo,
				customer: row.customer,
				amount: row.amount,
				currentValue: "check",
				neededAction: "Add check number",
			});
		}
		return items;
	});

	const totalPaymentsReceived = roundMoney(
		payments
			.filter((row) => row.amount > 0)
			.reduce((sum, row) => sum + row.amount, 0),
	);
	const totalRefunds = roundMoney(
		payments
			.filter((row) => row.amount < 0)
			.reduce((sum, row) => sum + Math.abs(row.amount), 0),
	);

	return {
		timezone: input.timezone,
		periodStart: input.from,
		periodEnd: input.to,
		totalPaymentsReceived,
		totalRefunds,
		netReceived: roundMoney(totalPaymentsReceived - totalRefunds),
		paymentCount: payments.length,
		methodTotals,
		payments,
		exceptions,
		generatedAt: new Date(),
	};
}
