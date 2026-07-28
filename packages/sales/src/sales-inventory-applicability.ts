import type { SalesOrderLifecycleStatus } from "./order-status";
import { hasPassedInventoryTrackingRepairBoundary } from "./sales-inventory-policy";

export const SALES_INVENTORY_PROJECTION_VERSION = 1;

export type SalesInventoryProjectionStatus = "syncing" | "ready" | "failed";

export type SalesInventoryProjectionLike = {
	status: string;
	needCount: number;
	completedAt?: Date | null;
};

export type SalesInventoryApplicabilityState =
	| "applicable"
	| "not_applicable"
	| "not_synced"
	| "legacy_not_applicable"
	| "syncing"
	| "failed";

export type SalesInventoryApplicability = {
	state: SalesInventoryApplicabilityState;
	needCount: number | null;
	isInboundApplicable: boolean | null;
	canManualSync: boolean;
	label: string;
	description: string;
	lastSyncedAt: Date | null;
};

export function resolveSalesInventoryApplicability(input: {
	lifecycleStatus: SalesOrderLifecycleStatus;
	projection?: SalesInventoryProjectionLike | null;
}): SalesInventoryApplicability {
	const projection = input.projection;
	const passedRepairBoundary = hasPassedInventoryTrackingRepairBoundary(
		input.lifecycleStatus,
	);

	if (!projection) {
		if (passedRepairBoundary) {
			return {
				state: "legacy_not_applicable",
				needCount: null,
				isInboundApplicable: false,
				canManualSync: false,
				label: "N/A",
				description:
					"Inventory is not applicable because this sale reached production completion before inventory synchronization was available.",
				lastSyncedAt: null,
			};
		}

		return {
			state: "not_synced",
			needCount: null,
			isInboundApplicable: null,
			canManualSync: true,
			label: "Not synced",
			description:
				"Open the Inventory tab to synchronize this legacy sale manually.",
			lastSyncedAt: null,
		};
	}

	if (projection.status === "syncing") {
		return {
			state: "syncing",
			needCount: null,
			isInboundApplicable: null,
			canManualSync: false,
			label: "Syncing…",
			description: "Inventory requirements are being synchronized.",
			lastSyncedAt: projection.completedAt ?? null,
		};
	}

	if (projection.status !== "ready") {
		return {
			state: "failed",
			needCount: null,
			isInboundApplicable: null,
			canManualSync: !passedRepairBoundary,
			label: "Review",
			description: passedRepairBoundary
				? "Inventory synchronization did not finish before this sale passed the repair boundary."
				: "Inventory synchronization needs review. Open the Inventory tab to retry.",
			lastSyncedAt: projection.completedAt ?? null,
		};
	}

	const needCount = Math.max(0, Number(projection.needCount || 0));
	if (needCount === 0) {
		return {
			state: "not_applicable",
			needCount: 0,
			isInboundApplicable: false,
			canManualSync: false,
			label: "N/A",
			description: "No inventory requirements were found for this sale.",
			lastSyncedAt: projection.completedAt ?? null,
		};
	}

	return {
		state: "applicable",
		needCount,
		isInboundApplicable: true,
		canManualSync: false,
		label: "Inventory required",
		description: `${needCount} inventory requirement${
			needCount === 1 ? "" : "s"
		} found for this sale.`,
		lastSyncedAt: projection.completedAt ?? null,
	};
}
