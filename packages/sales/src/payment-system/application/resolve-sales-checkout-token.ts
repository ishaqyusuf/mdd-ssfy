import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import type { SalesCheckoutTokenPayload } from "../contracts/checkout";

export function resolveSalesCheckoutToken(
	token: string,
): SalesCheckoutTokenPayload {
	return (
		validateToken(token, tokenSchemas.salesPaymentTokenSchema) || {
			amount: null,
			paymentId: null,
			salesIds: [],
			walletId: null,
		}
	);
}
