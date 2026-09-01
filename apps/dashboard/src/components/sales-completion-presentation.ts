import type { SalesOrderStatusMenuItem } from "./sales-status-menu-actions";

export type SalesCompletionChoice = "FULL_WORKFLOW" | "STATUS_ONLY";

export type SalesCompletionProjectionPresentation = {
	isRecentOrder?: boolean;
	revision?: string;
	productionCompletionSatisfied?: boolean;
	productionCompletionSource?:
		| "OPERATIONAL_WORKFLOW"
		| "STATUS_ONLY"
		| "IMPLIED_BY_FULFILLMENT"
		| "NONE";
	availableActions?: {
		markProductionStatusOnly?: boolean;
		cancelProductionStatusOnly?: boolean;
		productionCancellationBlockedReason?: string | null;
	};
	activeProductionRecord?: {
		completionMethod?: "STATUS_ONLY" | "FULL_WORKFLOW";
		effectiveAt?: Date | string | null;
		recordedAt?: Date | string;
		recordedBy?: { id?: number; name?: string | null };
	} | null;
};

export function getDefaultSalesCompletionChoice(): SalesCompletionChoice {
	return "FULL_WORKFLOW";
}

export function canShowStatusOnlyCompletionChoice(input: {
	canView: boolean;
	salesOrderCount: number;
}) {
	return input.canView && input.salesOrderCount === 1;
}

export function applyProductionCompletionProjection(
	actions: readonly SalesOrderStatusMenuItem[],
	projection: SalesCompletionProjectionPresentation | null | undefined,
	canEditStatusOnly: boolean,
) {
	if (!projection) return [...actions];
	const next = actions.map((item) =>
		item.action === "production_completed" &&
		projection.productionCompletionSatisfied
			? {
					...item,
					label:
						projection.productionCompletionSource === "STATUS_ONLY"
							? "Production completed — status only"
							: item.label,
					disabled: true,
				}
			: item,
	);
	if (
		projection.activeProductionRecord?.completionMethod === "STATUS_ONLY" &&
		!next.some((item) => item.action === "cancel_production")
	) {
		next.push({
			action: "cancel_production",
			label: "Cancel Production status only",
			disabled:
				!canEditStatusOnly ||
				!projection.availableActions?.cancelProductionStatusOnly,
		});
	}
	return next;
}
