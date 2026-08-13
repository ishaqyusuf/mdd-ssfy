import type {
	SpecialOrderOperationalDecision,
} from "./enforcement";

export type SpecialOrderOperationWarning = {
	code: "SPECIAL_ORDER_APPROVAL_REQUIRED";
	enforcementMode: "WARNING_ONLY";
	message: string;
	operation: SpecialOrderOperationalDecision["operation"];
	orderId: string;
	recommendedAction: "Request customer approval from Sales.";
	status: string;
};

export type SpecialOrderOperationFeedback = {
	warnings: SpecialOrderOperationWarning[];
};

export function toSpecialOrderOperationWarning(
	decision: SpecialOrderOperationalDecision,
): SpecialOrderOperationWarning | null {
	if (!decision.warning || !decision.approvalRequired || decision.blocked) {
		return null;
	}

	const orderId = decision.orderNo || String(decision.salesOrderId);
	const operationLabel = decision.operation.toLowerCase();
	return {
		code: "SPECIAL_ORDER_APPROVAL_REQUIRED",
		enforcementMode: "WARNING_ONLY",
		message: `Order ${orderId} is a Special Order with status “${decision.statusLabel}”. ${operationLabel[0]!.toUpperCase()}${operationLabel.slice(1)} continued in Warning Only mode. Request customer approval from Sales.`,
		operation: decision.operation,
		orderId,
		recommendedAction: "Request customer approval from Sales.",
		status: decision.statusLabel,
	};
}

export function attachSpecialOrderOperationFeedback<T>(
	result: T,
	decisions: readonly SpecialOrderOperationalDecision[],
): T | (T & { specialOrderOperation: SpecialOrderOperationFeedback }) {
	const warnings = decisions
		.map(toSpecialOrderOperationWarning)
		.filter((warning): warning is SpecialOrderOperationWarning => Boolean(warning));
	if (
		warnings.length === 0 ||
		!result ||
		typeof result !== "object" ||
		Array.isArray(result)
	) {
		return result;
	}

	return {
		...result,
		specialOrderOperation: { warnings },
	};
}
