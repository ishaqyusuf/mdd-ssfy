export type SpecialOrderSignalVariant = "success" | "destructive" | "outline";

export function getSpecialOrderSignalState(
	declaration?: string | null,
	status?: string | null,
): {
	label: string;
	variant: SpecialOrderSignalVariant;
	detail: string;
} {
	if (declaration !== "YES") {
		return declaration === "NO"
			? {
					label: "Not special order",
					variant: "outline",
					detail: "Approval not required",
				}
			: {
					label: "Not evaluated",
					variant: "outline",
					detail: "Special Order status not evaluated",
				};
	}
	if (status === "CUSTOMER_APPROVED") {
		return {
			label: "Signed",
			variant: "success",
			detail: "Customer approved",
		};
	}
	const detail =
		status === "REAPPROVAL_REQUIRED"
			? "Reapproval required"
			: status === "CUSTOMER_DECLINED"
				? "Customer declined"
				: "Signature pending";
	return { label: "Not signed", variant: "destructive", detail };
}
