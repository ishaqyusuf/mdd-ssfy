import type { Db, TransactionClient } from "@gnd/db";
import { generateRandomString } from "@gnd/utils";
import { tokenize } from "@gnd/utils/tokenizer";
import type { SalesPaymentMethods } from "../../constants";
import type {
	SalesCheckoutOrderSummary,
	SalesCheckoutTokenPayload,
} from "../contracts/checkout";

export interface CreatePendingLegacySalesCheckoutInput {
	amount: number;
	orders: SalesCheckoutOrderSummary[];
	paymentMethod: SalesPaymentMethods;
	tokenPayload: SalesCheckoutTokenPayload;
}

export async function createPendingLegacySalesCheckout(
	db: Db | TransactionClient,
	input: CreatePendingLegacySalesCheckoutInput,
) {
	const squarePayment = await db.squarePayments.create({
		data: {
			status: "PENDING",
			paymentId: generateRandomString(),
			orders: {
				createMany: {
					data: input.orders.map((order) => ({
						orderId: order.id,
					})),
				},
			},
			amount: input.amount,
			paymentMethod: input.paymentMethod,
			tip: 0,
			checkout: {
				create: {
					orderId: input.orders[0]?.id,
					paymentType: input.paymentMethod,
					amount: input.amount,
				},
			},
		},
	});

	return {
		squarePaymentId: squarePayment.id,
		redirectToken: tokenize({
			...input.tokenPayload,
			paymentId: squarePayment.id,
		}),
	};
}
