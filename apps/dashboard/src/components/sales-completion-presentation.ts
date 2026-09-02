import type { SalesOrderStatusMenuItem } from "./sales-status-menu-actions";

export type SalesCompletionChoice = "FULL_WORKFLOW" | "STATUS_ONLY";

export type SalesCompletionProjectionPresentation = {
	isRecentOrder?: boolean;
	revision?: string;
	productionCompletionSatisfied?: boolean;
	fulfillmentCompletionSatisfied?: boolean;
	fulfillmentDisposition?:
		| "PENDING"
		| "ADMINISTRATIVELY_COMPLETED"
		| "FULFILLED";
	productionCompletionSource?:
		| "OPERATIONAL_WORKFLOW"
		| "STATUS_ONLY"
		| "IMPLIED_BY_FULFILLMENT"
		| "NONE";
	availableActions?: {
		markProductionStatusOnly?: boolean;
		cancelProductionStatusOnly?: boolean;
		productionCancellationBlockedReason?: string | null;
		markFulfillmentStatusOnly?: boolean;
		cancelFulfillmentStatusOnly?: boolean;
	};
	activeProductionRecord?: {
		completionMethod?: "STATUS_ONLY" | "FULL_WORKFLOW";
		effectiveAt?: Date | string | null;
		recordedAt?: Date | string;
		recordedBy?: { id?: number; name?: string | null };
	} | null;
	activeFulfillmentRecord?: {
		completionMethod?: "STATUS_ONLY" | "FULL_WORKFLOW";
		effectiveAt?: Date | string | null;
		recordedAt?: Date | string;
		recordedBy?: { id?: number; name?: string | null };
	} | null;
};

export function getDefaultSalesCompletionChoice(): SalesCompletionChoice {
	return "FULL_WORKFLOW";
}

export function applyFulfillmentCompletionProjection(
	actions: readonly SalesOrderStatusMenuItem[],
	projection: SalesCompletionProjectionPresentation | null | undefined,
	canEditStatusOnly: boolean,
) {
	if (!projection) return [...actions];
	const hasStatusOnlyFulfillment =
		projection.activeFulfillmentRecord?.completionMethod === "STATUS_ONLY";
	const next = actions.map((item) => {
		if (
			item.action === "fulfilled" &&
			projection.fulfillmentCompletionSatisfied
		) {
			return {
				...item,
				label:
					projection.fulfillmentDisposition === "ADMINISTRATIVELY_COMPLETED"
						? "Fulfillment completed — status only"
						: item.label,
				disabled: true,
			};
		}
		if (item.action === "cancel_fulfillment" && hasStatusOnlyFulfillment) {
			return {
				...item,
				label: "Cancel Fulfillment status only",
				disabled:
					!canEditStatusOnly ||
					!projection.availableActions?.cancelFulfillmentStatusOnly,
			};
		}
		return item;
	});
	if (
		hasStatusOnlyFulfillment &&
		!next.some((item) => item.action === "cancel_fulfillment")
	) {
		next.push({
			action: "cancel_fulfillment",
			label: "Cancel Fulfillment status only",
			disabled:
				!canEditStatusOnly ||
				!projection.availableActions?.cancelFulfillmentStatusOnly,
		});
	}
	return next;
}

export function canShowStatusOnlyCompletionChoice(input: {
	canView: boolean;
	salesOrderCount: number;
}) {
	return input.canView && input.salesOrderCount > 0;
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
