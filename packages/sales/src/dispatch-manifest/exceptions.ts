export const dispatchExceptionReasonCodes = [
	"wrong_address",
	"customer_not_home",
	"damaged_items",
	"access_issue",
	"other",
] as const;

export type DispatchExceptionReasonCode =
	(typeof dispatchExceptionReasonCodes)[number];

export const dispatchExceptionStatuses = ["open", "resolved"] as const;
export type DispatchExceptionStatus =
	(typeof dispatchExceptionStatuses)[number];

export const dispatchExceptionTripActions = [
	"keep_assigned",
	"reschedule",
	"cancel",
] as const;
export type DispatchExceptionTripAction =
	(typeof dispatchExceptionTripActions)[number];

const reasonLabels: Record<DispatchExceptionReasonCode, string> = {
	wrong_address: "Wrong address",
	customer_not_home: "Customer not home",
	damaged_items: "Damaged items",
	access_issue: "Access issue",
	other: "Other",
};

export function getDispatchExceptionReasonLabel(
	reasonCode: DispatchExceptionReasonCode,
) {
	return reasonLabels[reasonCode];
}

export function normalizeDispatchExceptionNotes(value?: string | null) {
	const notes = value?.trim() || null;
	return notes?.slice(0, 2_000) || null;
}
