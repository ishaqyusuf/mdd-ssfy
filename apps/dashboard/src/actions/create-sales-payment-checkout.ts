"use server";

import type { SquarePaymentStatus } from "@/_v2/lib/square";
import type { PaymentMethods } from "@/app-deps/(clean-code)/(sales)/types";
import { prisma as _prisma } from "@/db";
import { getBaseUrl } from "@/envs";
import { generateRandomString } from "@/lib/utils";
import { squareSalesNote } from "@/utils/sales-utils";
import { SQUARE_LOCATION_ID, squareClient } from "@/utils/square-utils";
import { runDbTransaction } from "@gnd/db/transactions";
import { AppError, toPublicError } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import * as Sentry from "@sentry/nextjs";

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
	try {
		const { orderIds, emailToken, orderIdsParam } = props;
		const data = await getSalesPaymentCheckoutInfoAction(orderIds, emailToken);
		const phoneNo = normalizeBuyerPhoneNumber(data.primaryPhone);
		const paymentId = generateRandomString();

		const tx = await runDbTransaction(
			{
				client: _prisma,
				operation: "payments.create-checkout-record",
				profile: "standard",
			},
			async (prisma) =>
				prisma.customerTransaction.create({
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
								paymentId,
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
				}),
		);

		const redirectUrl = `${getBaseUrl()}/square-payment/${emailToken}/${orderIdsParam}/payment-response/${
			paymentId
		}`;
		let paymentLink: Awaited<
			ReturnType<typeof squareClient.checkout.paymentLinks.create>
		>["paymentLink"];
		try {
			const resp = await squareClient.checkout.paymentLinks.create({
				idempotencyKey: paymentId,
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

			paymentLink = resp.paymentLink;
		} catch (error) {
			try {
				await _prisma.customerTransaction.update({
					where: { id: tx.id },
					data: {
						status: "FAILED" as SquarePaymentStatus,
						statusReason: "PAYMENT_PROVIDER_UNAVAILABLE",
					},
				});
			} catch (cleanupError) {
				const cleanupReport = buildErrorReport(cleanupError, {
					operation: "payments.mark-checkout-failed",
					runtime: "dashboard",
					source: "server-action",
				});
				if (cleanupReport.classified.reportable) {
					Sentry.captureException(
						cleanupReport.reportableError,
						cleanupReport.captureContext,
					);
				}
			}
			throw new AppError({
				cause: error,
				code: "PROVIDER_UNAVAILABLE",
				operation: "payments.create-square-link",
				publicMessage:
					"We couldn't start the payment. Please wait a moment and try again.",
			});
		}

		await _prisma.squarePayments.update({
			where: {
				id: tx.squarePayment.id,
			},
			data: {
				paymentLink: paymentLink?.url,
				squareOrderId: paymentLink?.orderId,
			},
		});

		return { paymentLink: paymentLink?.url };
	} catch (error) {
		const report = buildErrorReport(error, {
			operation: "payments.create-checkout-link",
			runtime: "dashboard",
			source: "server-action",
		});
		if (report.classified.reportable) {
			Sentry.captureException(report.reportableError, report.captureContext);
		}
		return {
			error: toPublicError(report.classified),
			paymentLink: undefined,
		};
	}
}
