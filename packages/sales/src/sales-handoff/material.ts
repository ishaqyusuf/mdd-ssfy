import { resolveSalesInventoryTrackingPolicy } from "../sales-inventory-tracking-policy";

const ACTIVE_LINKED_INBOUND_STATUSES = new Set([
	"pending",
	"in_progress",
	"issue_open",
]);
const TERMINAL_COMPONENT_STATUSES = new Set(["cancelled", "fulfilled"]);

export type MaterialHandoffDemandEvidence = {
	id: number;
	qty: number | null;
	qtyReceived: number | null;
	status: string | null;
	deletedAt?: Date | string | null;
	inboundShipmentItemId?: number | null;
	inboundShipmentItem?: {
		id?: number | null;
		deletedAt?: Date | string | null;
		inbound?: {
			id?: number | null;
			status?: string | null;
			deletedAt?: Date | string | null;
		} | null;
	} | null;
};

export type MaterialHandoffComponent = Parameters<
	typeof resolveSalesInventoryTrackingPolicy
>[0] & {
	id: number;
	required?: boolean | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	inboundDemands?: MaterialHandoffDemandEvidence[] | null;
};

export type MaterialHandoffProjectionReason =
	| "ACTION_REQUIRED"
	| "PAYMENT_NOT_QUALIFIED"
	| "INVENTORY_NOT_APPLICABLE"
	| "NO_UNCOVERED_MATERIAL";

export type MaterialHandoffProjection = {
	actionable: boolean;
	uncoveredQty: number;
	applicableComponentCount: number;
	reason: MaterialHandoffProjectionReason;
	evidenceRevision: string;
};

function qty(value: number | null | undefined) {
	const parsed = Number(value || 0);
	return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function activeLinkedInboundCoverage(demand: MaterialHandoffDemandEvidence) {
	if (demand.deletedAt || !demand.inboundShipmentItemId) return 0;
	if (String(demand.status || "").toLowerCase() === "cancelled") return 0;
	const item = demand.inboundShipmentItem;
	const inbound = item?.inbound;
	if (!item || item.deletedAt || !inbound || inbound.deletedAt) return 0;
	if (
		!ACTIVE_LINKED_INBOUND_STATUSES.has(
			String(inbound.status || "").toLowerCase(),
		)
	) {
		return 0;
	}
	return Math.max(0, qty(demand.qty) - qty(demand.qtyReceived));
}

function stableEvidenceRevision(value: unknown) {
	const text = JSON.stringify(value);
	let hash = 2_166_136_261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return `material-v1-${(hash >>> 0).toString(36)}`;
}

export function projectMaterialSalesHandoff(input: {
	paymentQualified: boolean;
	inventoryApplicable: boolean;
	components: MaterialHandoffComponent[];
}): MaterialHandoffProjection {
	const evidence = input.components
		.map((component) => ({
			id: component.id,
			required: component.required !== false,
			tracking: resolveSalesInventoryTrackingPolicy(component),
			qty: qty(component.qty),
			qtyAllocated: qty(component.qtyAllocated),
			qtyReceived: qty(component.qtyReceived),
			status: String(component.status || "").toLowerCase(),
			demands: (component.inboundDemands || [])
				.map((demand) => ({
					id: demand.id,
					qty: qty(demand.qty),
					qtyReceived: qty(demand.qtyReceived),
					status: String(demand.status || "").toLowerCase(),
					deleted: Boolean(demand.deletedAt),
					itemId: demand.inboundShipmentItemId ?? null,
					itemDeleted: Boolean(demand.inboundShipmentItem?.deletedAt),
					inboundId: demand.inboundShipmentItem?.inbound?.id ?? null,
					inboundStatus: String(
						demand.inboundShipmentItem?.inbound?.status || "",
					).toLowerCase(),
					inboundDeleted: Boolean(
						demand.inboundShipmentItem?.inbound?.deletedAt,
					),
				}))
				.sort((left, right) => left.id - right.id),
		}))
		.sort((left, right) => left.id - right.id);
	const evidenceRevision = stableEvidenceRevision(evidence);

	if (!input.paymentQualified) {
		return {
			actionable: false,
			uncoveredQty: 0,
			applicableComponentCount: 0,
			reason: "PAYMENT_NOT_QUALIFIED",
			evidenceRevision,
		};
	}
	if (!input.inventoryApplicable) {
		return {
			actionable: false,
			uncoveredQty: 0,
			applicableComponentCount: 0,
			reason: "INVENTORY_NOT_APPLICABLE",
			evidenceRevision,
		};
	}

	let uncoveredQty = 0;
	let applicableComponentCount = 0;
	for (const component of input.components) {
		const sourceStatus = String(component.status || "").toLowerCase();
		if (
			component.required === false ||
			TERMINAL_COMPONENT_STATUSES.has(sourceStatus) ||
			resolveSalesInventoryTrackingPolicy(component) !== "tracked"
		) {
			continue;
		}
		const requiredQty = qty(component.qty);
		const pendingQty = Math.max(
			0,
			requiredQty - qty(component.qtyAllocated) - qty(component.qtyReceived),
		);
		if (requiredQty <= 0 || pendingQty <= 0) continue;
		applicableComponentCount += 1;
		const linkedCoverage = (component.inboundDemands || []).reduce(
			(total, demand) => total + activeLinkedInboundCoverage(demand),
			0,
		);
		uncoveredQty += Math.max(0, pendingQty - linkedCoverage);
	}

	const normalizedUncoveredQty = Math.round(uncoveredQty * 10_000) / 10_000;
	return {
		actionable: normalizedUncoveredQty > 0,
		uncoveredQty: normalizedUncoveredQty,
		applicableComponentCount,
		reason:
			normalizedUncoveredQty > 0 ? "ACTION_REQUIRED" : "NO_UNCOVERED_MATERIAL",
		evidenceRevision,
	};
}
