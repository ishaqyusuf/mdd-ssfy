import { createHash } from "node:crypto";
import type {
	SalesProductionPlan,
	SalesProductionPlanComponent,
} from "./sales-fulfillment-plan";

export function normalizeProductionReadinessNumber(value: number) {
	return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

export function isProductionReadinessOverrideActive(
	override: { status: string; revision: string } | null | undefined,
	revision: string | null,
) {
	return (
		revision != null &&
		override?.status === "ACTIVE" &&
		override.revision === revision
	);
}

function componentEvidence(component: SalesProductionPlanComponent) {
	return {
		lineItemId: component.lineItemId,
		salesItemId: component.salesItemId,
		componentId: component.componentId,
		inventoryId: component.inventoryId,
		inventoryVariantId: component.inventoryVariantId,
		inventoryCategoryId: component.inventoryCategoryId,
		required: component.required,
		stockStatus: component.stockStatus,
		readiness: component.readiness,
		lineReadiness: component.lineReadiness,
		orderedQty: normalizeProductionReadinessNumber(component.orderedQty),
		allocatedQty: normalizeProductionReadinessNumber(component.allocatedQty),
		pendingReviewQty: normalizeProductionReadinessNumber(
			component.pendingReviewQty,
		),
		pickedQty: normalizeProductionReadinessNumber(component.pickedQty),
		shippedQty: normalizeProductionReadinessNumber(component.shippedQty),
		remainingQty: normalizeProductionReadinessNumber(component.remainingQty),
		backorderedQty: normalizeProductionReadinessNumber(
			component.backorderedQty,
		),
		inboundQty: normalizeProductionReadinessNumber(component.inboundQty),
		receivedQty: normalizeProductionReadinessNumber(component.receivedQty),
		allocations: component.allocationEvidence
			.map((allocation) => ({
				id: allocation.id,
				qty: normalizeProductionReadinessNumber(allocation.qty),
				status: allocation.status,
			}))
			.sort((left, right) =>
				JSON.stringify(left).localeCompare(JSON.stringify(right)),
			),
		inboundDemands: component.inboundEvidence
			.map((demand) => ({
				id: demand.id,
				qty: normalizeProductionReadinessNumber(demand.qty),
				qtyReceived: normalizeProductionReadinessNumber(demand.qtyReceived),
				status: demand.status,
				inboundShipmentItemId: demand.inboundShipmentItemId,
			}))
			.sort((left, right) =>
				JSON.stringify(left).localeCompare(JSON.stringify(right)),
			),
	};
}

export function buildProductionReadinessRevision(
	plan: SalesProductionPlan,
): string | null {
	if (!plan.components.length) return null;

	const evidence = plan.components
		.map(componentEvidence)
		.sort((left, right) =>
			JSON.stringify(left).localeCompare(JSON.stringify(right)),
		);

	return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
}
