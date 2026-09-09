import { getPublicError } from "@gnd/errors";

export function createSaveFailure(
	error: unknown,
	operation: string,
	orderId?: string | null,
	saved = false,
) {
	const failure = getPublicError(error);
	const occurredAt = new Date().toISOString();
	const details = [
		`Order: ${orderId || "New sale"}`,
		`Save confirmed: ${saved ? "Yes" : "No"}`,
		`Step: ${operation}`,
		`Reason: ${failure.message}`,
		`Code: ${failure.code}`,
		`Reference: ${failure.referenceId}`,
		`Time: ${occurredAt}`,
	].join("\n");
	return { ...failure, saved, operation, orderId, occurredAt, details };
}
export type SaveFailure = ReturnType<typeof createSaveFailure>;
