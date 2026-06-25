import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";

export const getSaleTransactionsSchema = z.object({
	orderNo: z.string().optional().nullable(),
	accountNo: z.string().optional().nullable(),
});

export async function getSaleTransactions(
	ctx: TRPCContext,
	input: z.infer<typeof getSaleTransactionsSchema>,
) {
	const orderNos = (input.orderNo || "")
		.split(",")
		.map((orderNo) => orderNo.trim())
		.filter(Boolean);
	const hasOrderFilter = Boolean(orderNos.length);
	const paymentOrderFilter = {
		type: "order",
		...(hasOrderFilter
			? {
					orderId: {
						in: orderNos,
					},
				}
			: {}),
	};

	if (!hasOrderFilter && !input.accountNo) return { data: [] };

	const list = await ctx.db.customerTransaction.findMany({
		where: {
			AND: [
				{
					OR: [
						{
							status: {
								in: ["success", "cancelled", "canceled"],
							},
							paymentMethod: {
								not: null,
							},
							salesPayments: { some: {} },
						},
						{
							paymentMethod: "link",
							amount: {
								gt: 0,
							},
							salesPayments: {
								some: {},
							},
						},
					],
				},
				...(input.accountNo && !hasOrderFilter
					? [
							{
								wallet: {
									accountNo: input.accountNo,
								},
							},
						]
					: []),
				...(hasOrderFilter
					? [
							{
								salesPayments: {
									some: {
										order: {
											orderId: {
												in: orderNos,
											},
										},
									},
								},
							},
						]
					: []),
			],
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			amount: true,
			createdAt: true,
			description: true,
			status: true,
			paymentMethod: true,
			meta: true,
			history: {
				select: {
					id: true,
					authorName: true,
					status: true,
					createdAt: true,
					description: true,
					reason: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			},
			author: {
				select: {
					name: true,
					id: true,
				},
			},
			salesPayments: {
				where: {
					deletedAt: null,
					order: paymentOrderFilter,
				},
				select: {
					amount: true,
					status: true,
					meta: true,
					squarePayments: {
						select: {
							paymentId: true,
						},
					},
					order: {
						select: {
							subTotal: true,
							orderId: true,
							id: true,
							grandTotal: true,
							extraCosts: {
								where: {
									type: {
										in: ["Labor", "Delivery"],
									},
								},
								select: {
									type: true,
									amount: true,
								},
							},
							salesRep: {
								select: {
									name: true,
									id: true,
								},
							},
						},
					},
				},
			},
		},
	});

	return {
		data: list.map((item) => {
			const amount = item.salesPayments?.length
				? item.salesPayments.reduce(
						(total, payment) => total + Number(payment.amount || 0),
						0,
					)
				: Math.abs(Number(item.amount || 0));
			const orderIds = item.salesPayments.map((payment) => payment.order.orderId);
			const orderIdsString = orderIds
				.join(", ")
				.replace(/,([^,]*)$/, " &$1");
			const paymentMethod = item.paymentMethod;
			const meta = (item.meta || {}) as Record<string, any>;
			const spMeta = (item.salesPayments?.[0]?.meta || {}) as Record<string, any>;
			const spStatus = item.salesPayments?.[0]?.status;
			let status = item.status;
			if (
				paymentMethod === "link" &&
				status?.toLocaleLowerCase() === "pending"
			) {
				status = spStatus;
			}
			const order = item.salesPayments?.[0]?.order;
			const laborCost = order?.extraCosts?.find(
				(cost) => cost.type === "Labor",
			)?.amount;
			const deliveryCost = order?.extraCosts?.find(
				(cost) => cost.type === "Delivery",
			)?.amount;

			return {
				checkNo: meta.checkNo || spMeta.checkNo,
				reason: item.history?.[0]?.reason,
				uuid: item.id,
				id: item.id,
				paymentNo: item.id?.toString().padStart(5, "0"),
				authorName: item.author?.name,
				status,
				createdAt: item.createdAt,
				amount,
				paymentMethod,
				description: item.description,
				ordersCount: item.salesPayments?.length,
				orderIds: orderIdsString,
				salesReps: Array.from(
					new Set(
						item.salesPayments
							?.map((payment) => payment.order?.salesRep?.name)
							.filter((name): name is string => Boolean(name)),
					),
				),
				sales: item.salesPayments,
				meta,
				history: item.history,
				laborCost,
				deliveryCost,
				grandTotal: order?.grandTotal,
				subTotal: order?.subTotal,
				squarePaymentId: item.salesPayments?.[0]?.squarePayments?.paymentId,
			};
		}),
	};
}
