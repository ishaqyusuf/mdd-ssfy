import type { Db, TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	SpecialOrderApprovalRequiredError,
	type SpecialOrderOperationCategory,
	assertSpecialOrderOperationAllowed,
} from "@gnd/sales/special-order";
import { captureSpecialOrderOperationDecision } from "./special-order-operation-feedback";

export async function assertSpecialOrderOperationAllowedForApi(
	db: Db | TransactionClient,
	input: {
		salesOrderId: number;
		operation: SpecialOrderOperationCategory;
		authorName?: string | null;
		actorUserId?: number | null;
		source?: string | null;
	},
	observabilityDb: Db | TransactionClient = db,
) {
	try {
		const decision = await assertSpecialOrderOperationAllowed(
			db,
			input,
			observabilityDb,
		);
		captureSpecialOrderOperationDecision(decision);
		return decision;
	} catch (error) {
		if (!(error instanceof SpecialOrderApprovalRequiredError)) throw error;
		const { decision } = error;
		throw new AppError({
			code: "SPECIAL_ORDER_APPROVAL_REQUIRED",
			cause: error,
			internalMessage: error.message,
			publicMessage: `Order ${decision.orderNo || decision.salesOrderId} is a Special Order with status “${decision.statusLabel}”. ${decision.enforcementMode} blocks ${decision.operation.toLowerCase()}. Request customer approval from Sales.`,
		});
	}
}
