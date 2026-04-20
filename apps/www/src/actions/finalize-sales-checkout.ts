"use server";

import type { SquarePaymentStatus } from "@/_v2/lib/square";
import type { SalesPaymentStatus } from "@/app-deps/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { expireCurrentSalesDocumentSnapshots } from "@gnd/api/utils/sales-document-access";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { buildSalesCheckoutSuccessNotificationEvent } from "@gnd/sales/payment-system";
import { tasks } from "@trigger.dev/sdk/v3";

import { createPayrollAction } from "./create-payroll";

interface Props {
	salesPaymentId: string;
}
export async function finalizeSalesCheckout({ salesPaymentId }: Props) {
	const cTx = await prisma.customerTransaction.findFirst({
		where: {
			squarePayment: {
				paymentId: salesPaymentId,
			},
		},
		include: {
			salesPayments: {
				include: {
					order: true,
				},
			},
			squarePayment: {
				include: {
					orders: {
						include: {
							order: {
								select: {
									id: true,
									amountDue: true,
									orderId: true,
									customerId: true,
									customer: {
										select: {
											businessName: true,
											name: true,
										},
									},
									billingAddress: {
										select: {
											name: true,
										},
									},
									salesRep: {
										select: {
											email: true,
											name: true,
										},
									},
									payments: {
										select: {
											id: true,
											amount: true,
											status: true,
											transactionId: true,
											squarePaymentsId: true,
										},
									},
								},
							},
						},
					},
					checkout: {
						include: {
							tenders: true,
						},
					},
				},
			},
		},
	});
	const status = cTx.status as SquarePaymentStatus;
	if (status === "COMPLETED") throw new Error("Payment Already Applied!");

	const tenders = cTx.squarePayment.checkout.tenders;
	const validTenders = tenders.filter(
		(s) => s.status === ("COMPLETED" as SquarePaymentStatus),
	);
	if (!validTenders.length) {
		// const _status = Array.from(new Set(cTx.squarePayment.checkout.tenders.map(s =>s.status)));
		await prisma.customerTransaction.update({
			where: {
				id: cTx.id,
			},
			data: {
				status: "FAILED" as SquarePaymentStatus,
			},
		});
		throw new Error("Unable to validate payment");
	}
	const [totalAmount, totalTip] = [
		sum(validTenders, "amount"),
		sum(validTenders, "tip"),
	];
	const squarePayment = cTx.squarePayment;
	const tip =
		totalTip > 0 ? formatMoney(totalTip / squarePayment.orders.length) : 0;
	let balance = totalAmount;
	const salesRepsNotifications: Record<
		string,
		{
			amount: number;
			customerId: number | null;
			customerName?: string;
			ordersNo: string[];
			salesRepId: number;
		}
	> = {};
	const proms = await Promise.all(
		squarePayment.orders.map(async (o) => {
			const orderAmountDue = formatMoney(o.order.amountDue);
			const paidAmount =
				balance >= orderAmountDue
					? orderAmountDue
					: formatMoney(orderAmountDue - balance);
			balance = formatMoney(balance - paidAmount);
			if (paidAmount) {
				const sp = await prisma.salesPayments.create({
					data: {
						amount: paidAmount,
						tip,
						orderId: o.orderId,
						// squarePayments: {
						//     connect: {
						//         id: squarePayment.id,
						//     },
						// },
						note: "payment via square checkout",
						status: "success" as SalesPaymentStatus,
						transactionId: cTx.id,
						squarePaymentsId: squarePayment.id,

						// transaction: {
						//     connect: {
						//         id: cTx.id,
						//     },
						// },
					},
					select: {
						id: true,
						amount: true,
						order: {
							select: {
								salesRepId: true,
								id: true,
								orderId: true,
							},
						},
					},
				});
				const ord = await prisma.salesOrders.update({
					where: {
						id: o.orderId,
					},
					data: {
						amountDue: formatMoney(orderAmountDue - paidAmount),
					},
					select: {
						amountDue: true,
						orderId: true,
					},
				});
				const salesRep = o.order.salesRep;
				if (salesRep) {
					if (!salesRepsNotifications[salesRep.email])
						salesRepsNotifications[salesRep.email] = {
							amount: 0,
							customerId: o.order.customerId ?? null,
							customerName:
								o.order.customer?.businessName ||
								o.order.customer?.name ||
								o.order.billingAddress?.name,
							ordersNo: [],
							salesRepId: sp.order.salesRepId,
						};
					salesRepsNotifications[salesRep.email].amount += paidAmount;
					salesRepsNotifications[salesRep.email].ordersNo.push(o.order.orderId);
					await createPayrollAction({
						orderId: sp.order.id,
						userId: sp.order.salesRepId,
						salesPaymentId: sp.id,
						salesAmount: sp.amount,
					});
				}
				return {
					sp,
					ord,
				};
			}
			return {
				paidAmount,
			};
		}),
	);
	const tx = await prisma.customerTransaction.update({
		where: {
			id: cTx.id,
		},
		data: {
			status: "COMPLETED" as SquarePaymentStatus,
			amount: totalAmount,
		},
	});
	await sendPaymentSystemNotifications(
		tasks,
		{
			db: prisma,
		},
		Object.values(salesRepsNotifications).map((notification) =>
			buildSalesCheckoutSuccessNotificationEvent({
				amount: notification.amount,
				customerId: notification.customerId,
				customerName: notification.customerName,
				orderNos: notification.ordersNo,
				recipientEmployeeId: notification.salesRepId,
				recipientEmail: undefined,
			}),
		),
	);
	await Promise.all(
		squarePayment.orders.map((order) =>
			expireCurrentSalesDocumentSnapshots({
				db: prisma,
				salesOrderId: order.orderId,
				reason: "payment_recorded",
				documentPrefixes: ["invoice_pdf", "order_packing_pdf"],
			}),
		),
	);
	return {
		proms,
		notifications: Object.values(salesRepsNotifications),
		tip,
		totalAmount,
		tx,
	};
}
