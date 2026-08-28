import type { SalesOrderLifecycleStatus } from "./order-status";
import { hasPassedInventoryTrackingRepairBoundary } from "./sales-inventory-policy";

export type RecognizedSalesInventoryLegacyStatus =
	| "AVAILABLE"
	| "ORDERED"
	| "PENDING ORDER";

export type SalesInventoryLegacyCompatibilityState =
	| "none"
	| "legacy_locked"
	| "legacy_reconciled"
	| "conflict"
	| "unsupported"
	| "terminal";

export type SalesInventoryLegacyCompatibility = {
	state: SalesInventoryLegacyCompatibilityState;
	normalizedLegacyStatus: RecognizedSalesInventoryLegacyStatus | null;
	displayLabel: string | null;
	tone: "neutral" | "warning" | "destructive";
	description: string;
	recommendedAction: "none" | "continue" | "clear" | "review";
	canContinue: boolean;
	canClear: boolean;
	destinationSegment: "stock" | "inbounds";
	targetShipmentStatus: "pending" | "in_progress" | null;
	targetNeedAction: "create_inbound" | "fulfill_manually" | "none";
	reasonCode:
		| "no_legacy_status"
		| "legacy_status_requires_migration"
		| "legacy_status_already_represented"
		| "legacy_status_unsupported"
		| "legacy_status_terminal";
};

export function normalizeSalesInventoryLegacyStatus(
	status?: string | null,
): RecognizedSalesInventoryLegacyStatus | null {
	const normalized = String(status || "")
		.trim()
		.toUpperCase();

	return normalized === "AVAILABLE" ||
		normalized === "ORDERED" ||
		normalized === "PENDING ORDER"
		? normalized
		: null;
}

export function resolveSalesInventoryLegacyCompatibility(input: {
	legacyStatus?: string | null;
	lifecycleStatus: SalesOrderLifecycleStatus;
	inventoryRowCount: number;
	projectionStatus?: string | null;
	projectionNeedCount?: number | null;
	projectionSource?: string | null;
	linkedInboundCount?: number | null;
	activeLinkedInboundCount?: number | null;
}): SalesInventoryLegacyCompatibility {
	const rawLegacyStatus = String(input.legacyStatus || "").trim();
	const normalizedLegacyStatus =
		normalizeSalesInventoryLegacyStatus(rawLegacyStatus);

	if (!rawLegacyStatus) {
		return {
			state: "none",
			normalizedLegacyStatus: null,
			displayLabel: null,
			tone: "neutral",
			description: "No historical inbound status is saved for this sale.",
			recommendedAction: "none",
			canContinue: false,
			canClear: false,
			destinationSegment: "stock",
			targetShipmentStatus: null,
			targetNeedAction: "none",
			reasonCode: "no_legacy_status",
		};
	}

	if (!normalizedLegacyStatus) {
		return {
			state: "unsupported",
			normalizedLegacyStatus: null,
			displayLabel: "Status needs review",
			tone: "destructive",
			description:
				"This historical inbound status is not recognized and must be reviewed before inventory setup.",
			recommendedAction: "review",
			canContinue: false,
			canClear: true,
			destinationSegment: "stock",
			targetShipmentStatus: null,
			targetNeedAction: "none",
			reasonCode: "legacy_status_unsupported",
		};
	}

	const destinationSegment =
		normalizedLegacyStatus === "AVAILABLE" ? "stock" : "inbounds";
	const targetShipmentStatus =
		normalizedLegacyStatus === "ORDERED"
			? "in_progress"
			: normalizedLegacyStatus === "PENDING ORDER"
				? "pending"
				: null;
	const targetNeedAction =
		normalizedLegacyStatus === "AVAILABLE"
			? "fulfill_manually"
			: "create_inbound";

	if (hasPassedInventoryTrackingRepairBoundary(input.lifecycleStatus)) {
		return {
			state: "terminal",
			normalizedLegacyStatus,
			displayLabel: normalizedLegacyStatus,
			tone: "neutral",
			description:
				"This completed sale keeps its historical inbound status for review only.",
			recommendedAction: "none",
			canContinue: false,
			canClear: false,
			destinationSegment,
			targetShipmentStatus,
			targetNeedAction: "none",
			reasonCode: "legacy_status_terminal",
		};
	}

	const isRepresented =
		input.projectionStatus === "ready" ||
		Number(input.linkedInboundCount ?? input.activeLinkedInboundCount ?? 0) > 0;
	if (isRepresented) {
		return {
			state: "legacy_reconciled",
			normalizedLegacyStatus,
			displayLabel: normalizedLegacyStatus,
			tone: "neutral",
			description:
				"The historical status is already represented by canonical inventory state.",
			recommendedAction: "none",
			canContinue: false,
			canClear: false,
			destinationSegment,
			targetShipmentStatus,
			targetNeedAction,
			reasonCode: "legacy_status_already_represented",
		};
	}

	return {
		state: "legacy_locked",
		normalizedLegacyStatus,
		displayLabel: normalizedLegacyStatus,
		tone: "warning",
		description: `Legacy ${normalizedLegacyStatus} status — inventory setup will adapt automatically.`,
		recommendedAction: "continue",
		canContinue: true,
		canClear: true,
		destinationSegment,
		targetShipmentStatus,
		targetNeedAction,
		reasonCode: "legacy_status_requires_migration",
	};
}
