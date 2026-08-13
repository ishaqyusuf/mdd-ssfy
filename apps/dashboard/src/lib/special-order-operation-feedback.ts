export type SpecialOrderOperationWarning = {
	code: "SPECIAL_ORDER_APPROVAL_REQUIRED";
	enforcementMode: "WARNING_ONLY";
	message: string;
	operation: "PURCHASING" | "PRODUCTION" | "PACKING" | "DISPATCH";
	orderId: string;
	recommendedAction: "Request customer approval from Sales.";
	status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSpecialOrderOperationWarning(
	value: unknown,
): value is SpecialOrderOperationWarning {
	if (!isRecord(value)) return false;
	return (
		value.code === "SPECIAL_ORDER_APPROVAL_REQUIRED" &&
		value.enforcementMode === "WARNING_ONLY" &&
		typeof value.message === "string" &&
		["PURCHASING", "PRODUCTION", "PACKING", "DISPATCH"].includes(
			String(value.operation),
		) &&
		typeof value.orderId === "string" &&
		value.recommendedAction === "Request customer approval from Sales." &&
		typeof value.status === "string"
	);
}

export function getSpecialOrderOperationWarnings(
	data: unknown,
): SpecialOrderOperationWarning[] {
	if (!isRecord(data)) return [];
	const feedback = data.specialOrderOperation;
	if (!isRecord(feedback) || !Array.isArray(feedback.warnings)) return [];
	return feedback.warnings.filter(isSpecialOrderOperationWarning);
}

export function formatSpecialOrderOperationWarning(
	warning: SpecialOrderOperationWarning,
) {
	return {
		title: `Special Order ${warning.operation.toLowerCase()} warning`,
		description: `${warning.message} Open order ${warning.orderId} in Sales and request customer approval.`,
	};
}
