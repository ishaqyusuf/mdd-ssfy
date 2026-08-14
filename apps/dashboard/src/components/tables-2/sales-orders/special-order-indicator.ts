export type SalesOrderSpecialOrderIndicatorInput = {
	declaration?: "NO" | "YES" | null;
	status?:
		| "NOT_REQUIRED"
		| "SIGNATURE_PENDING"
		| "CUSTOMER_APPROVED"
		| "REAPPROVAL_REQUIRED"
		| "CUSTOMER_DECLINED"
		| null;
	label?: string | null;
	linkState?: "ACTIVE" | "EXPIRED" | null;
};

export type SalesOrderSpecialOrderIndicator = {
	label: string;
	toneClassName: string;
};

const TONES = {
	SIGNATURE_PENDING:
		"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
	CUSTOMER_APPROVED:
		"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
	REAPPROVAL_REQUIRED:
		"border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
	CUSTOMER_DECLINED:
		"border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
	EXPIRED:
		"border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
} as const;

export function resolveSalesOrderSpecialOrderIndicator(
	input: SalesOrderSpecialOrderIndicatorInput,
): SalesOrderSpecialOrderIndicator | null {
	if (input.declaration !== "YES") return null;
	if (input.linkState === "EXPIRED") {
		return {
			label: "Approval link expired",
			toneClassName: TONES.EXPIRED,
		};
	}

	const status = input.status ?? "SIGNATURE_PENDING";
	if (status === "NOT_REQUIRED") return null;

	return {
		label: input.label || "Signature pending",
		toneClassName: TONES[status],
	};
}
