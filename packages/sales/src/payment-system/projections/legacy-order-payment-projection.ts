import type { OrderPaymentProjection } from "../contracts";
import { buildLegacyOrderPaymentProjection } from "../domain";

export interface LegacyOrderPaymentProjectionInput {
	salesOrderId?: number | null;
	grandTotal: number | null | undefined;
	payments?: Array<{
		amount: number | null | undefined;
		status?: string | null;
	}> | null;
}

export function projectLegacyOrderPayments(
	input: LegacyOrderPaymentProjectionInput,
): OrderPaymentProjection {
	return buildLegacyOrderPaymentProjection(input);
}
