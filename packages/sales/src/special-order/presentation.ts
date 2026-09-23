import type {
	SpecialOrderDisplayState,
	SpecialOrderState,
	SpecialOrderStatus,
} from "./domain";

export const SPECIAL_ORDER_STATUS_LABELS = {
	NOT_REQUIRED: "Not required",
	SIGNATURE_PENDING: "Signature pending",
	CUSTOMER_APPROVED: "Customer approved",
	REAPPROVAL_REQUIRED: "Reapproval required",
	CUSTOMER_DECLINED: "Customer declined",
} satisfies Record<SpecialOrderStatus, string>;

export function resolveSpecialOrderDisplayState(
	state?: SpecialOrderState | null,
): SpecialOrderDisplayState {
	if (!state?.declaration) return "LEGACY_NOT_EVALUATED";
	if (state.declaration === "NO") return "NOT_REQUIRED";
	return state.status ?? "SIGNATURE_PENDING";
}

export function getSpecialOrderStatusLabel(
	state?: SpecialOrderState | null,
): string {
	const displayState = resolveSpecialOrderDisplayState(state);
	return displayState === "LEGACY_NOT_EVALUATED"
		? "Not evaluated"
		: SPECIAL_ORDER_STATUS_LABELS[displayState];
}

export function hasSpecialOrderCustomerEmail(
	email?: string | null,
): email is string {
	const value = email?.trim() || "";
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
