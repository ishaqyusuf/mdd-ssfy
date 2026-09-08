import type { Db } from "@gnd/db";

type PaymentReview = {
	paymentId: number;
	amount: number;
	origin: string;
	receivedAt: Date | null;
	reviewStatus: string;
};

/** Review action metadata only; never supplies invoice/payment totals. */
export async function getSalesOrderPaymentReviews(
	db: Pick<Db, "salesOrders">,
	salesIds: number[],
): Promise<Map<number, PaymentReview | null>> {
	if (!salesIds.length) return new Map();
	const rows = await db.salesOrders.findMany({
		where: { id: { in: salesIds } },
		select: {
			id: true,
			payments: {
				where: {
					deletedAt: null,
					reviewStatus: "needs_review",
					status: { in: ["success", "completed", "paid"] },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 1,
				select: {
					id: true,
					amount: true,
					origin: true,
					createdAt: true,
					reviewStatus: true,
				},
			},
		},
	});
	return new Map(
		rows.map((row) => {
			const payment = row.payments[0];
			return [
				row.id,
				payment
					? {
							paymentId: payment.id,
							amount: payment.amount,
							origin: payment.origin || "office",
							receivedAt: payment.createdAt,
							reviewStatus: payment.reviewStatus || "needs_review",
						}
					: null,
			] as const;
		}),
	);
}
