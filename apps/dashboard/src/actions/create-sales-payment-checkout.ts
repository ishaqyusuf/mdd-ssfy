"use server";

import type { SquarePaymentStatus } from "@/_v2/lib/square";
import type { PaymentMethods } from "@/app-deps/(clean-code)/(sales)/types";
import { prisma as _prisma } from "@/db";
import { getBaseUrl } from "@/envs";
import { generateRandomString } from "@/lib/utils";
import { squareSalesNote } from "@/utils/sales-utils";
import { SQUARE_LOCATION_ID, squareClient } from "@/utils/square-utils";

import type { CustomerTransactionType } from "./get-customer-tx-action";
import { getSalesPaymentCheckoutInfoAction } from "./get-sales-payment-checkout-info-action";

interface Props {
	emailToken: string;
	orderIds: string[];
	// primaryPhoneNo: string;
	orderIdsParam: string;
}

function normalizeBuyerPhoneNumber(phoneNo?: string | null): string | null {
	if (!phoneNo) return null;
	const raw = phoneNo.trim();
	if (!raw) return null;

	if (raw.startsWith("+")) {
		const digits = raw.slice(1).replace(/\D/g, "");
		if (digits.length < 8 || digits.length > 15) return null;
		return `+${digits}`;
	}

	const digits = raw.replace(/\D/g, "");
	if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
	return null;
}

export async function createSalesCheckoutLinkAction(props: Props) {
	return await _prisma.$transaction(async (prisma: typeof _prisma) => {
		const { orderIds, emailToken, orderIdsParam } = props;
		const data = await getSalesPaymentCheckoutInfoAction(orderIds, emailToken);
		const phoneNo = normalizeBuyerPhoneNumber(data.primaryPhone);

		// throw new Error("....");
		const tx = await prisma.customerTransaction.create({
			data: {
				wallet: {
					connectOrCreate: {
						where: {
							accountNo: data.primaryPhone,
						},
						create: {
							balance: 0,
							accountNo: data.primaryPhone,
						},
					},
				},
				amount: data.amountDue,
				paymentMethod: "link" as PaymentMethods,
				squarePayment: {
					create: {
						status: "PENDING" as SquarePaymentStatus,
						paymentId: generateRandomString(),
						// amount: totalAmount,
						orders: {
							createMany: {
								data: data.orders.map((order) => ({
									orderId: order.id,
								})),
							},
						},
						amount: data.amountDue,
						paymentMethod: "link" as PaymentMethods,
						tip: 0,
						checkout: {
							create: {
								paymentType: "link" as PaymentMethods,
							},
						},
					},
				},
				type: "transaction" as CustomerTransactionType,
				description: "",
				status: "PENDING" as SquarePaymentStatus,
			},
			include: {
				squarePayment: {
					include: {
						checkout: true,
						orders: true,
					},
				},
			},
		});

		const redirectUrl = `${getBaseUrl()}/square-payment/${emailToken}/${orderIdsParam}/payment-response/${
			tx.squarePayment?.paymentId
		}`;
		try {
			const resp = await squareClient.checkout.paymentLinks.create({
				idempotencyKey: new Date().toISOString(),
				quickPay: {
					locationId: SQUARE_LOCATION_ID,
					name: squareSalesNote(orderIds),
					priceMoney: {
						amount: BigInt(Math.round(data.amountDue * 100)),
						currency: "USD",
					},
				},
				prePopulatedData: {
					buyerEmail: data.email,
					...(phoneNo ? { buyerPhoneNumber: phoneNo } : {}),
					buyerAddress: {
						addressLine1: data.address,
					},
				},
				checkoutOptions: {
					redirectUrl,
					askForShippingAddress: false,
					allowTipping: false,
				},
			});

			// const paymentId = tx.squarePayment.paymentId;
			// const { result, statusCode, body: _body } = resp;
			const { paymentLink } = resp;
			await prisma.squarePayments.update({
				where: {
					id: tx.squarePayment.id,
				},
				data: {
					squareOrderId: paymentLink.orderId,
				},
			});
			// const paymentLink = result.paymentLink;
			return {
				paymentLink: paymentLink?.url,
			};
		} catch (error) {
			throw new Error(error.message);
		}
	});
}
