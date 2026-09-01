import type { Db } from "@gnd/db";

import type {
	GetSalesProductionPlanInput,
	SalesProductionPlanComponent,
	SalesProductionReadiness,
	SalesProductionStockStatus,
} from "../../sales-fulfillment-plan";
import { getSalesProductionPlan } from "../../sales-fulfillment-plan";

export type ProductionMaterialStatus = {
	salesOrderId: number | null;
	salesItemId: number | null;
	componentId: number | null;
	name: string;
	supplierName: string | null;
	readiness: SalesProductionReadiness;
	stockStatus: SalesProductionStockStatus;
	requiredQty: number;
	availableQty: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
	undatedOpenInboundQty: number;
};

type ProductionMaterialSource = Pick<
	SalesProductionPlanComponent,
	| "salesOrderId"
	| "salesItemId"
	| "componentId"
	| "componentName"
	| "inventoryVariantSku"
	| "supplierName"
	| "readiness"
	| "stockStatus"
	| "orderedQty"
	| "allocatedQty"
	| "inboundQty"
	| "receivedQty"
	| "inboundEvidence"
>;

function latestExpectedAt(
	evidence: SalesProductionPlanComponent["inboundEvidence"],
) {
	const expectedDates = evidence
		.filter(
			(item) =>
				item.status !== "cancelled" &&
				item.qty > item.qtyReceived &&
				item.expectedAt,
		)
		.map((item) => ({
			value: item.expectedAt as Date | string,
			time: new Date(item.expectedAt as Date | string).getTime(),
		}))
		.filter((item) => Number.isFinite(item.time));

	return (
		expectedDates.reduce<{ value: Date | string; time: number } | undefined>(
			(latest, item) => (!latest || item.time > latest.time ? item : latest),
			undefined,
		)?.value ?? null
	);
}

function undatedOpenInboundQty(
	evidence: SalesProductionPlanComponent["inboundEvidence"],
) {
	return evidence
		.filter(
			(item) =>
				item.status !== "cancelled" &&
				item.qty > item.qtyReceived &&
				!item.expectedAt,
		)
		.reduce(
			(total, item) => total + Math.max(0, item.qty - item.qtyReceived),
			0,
		);
}

export function buildProductionMaterialStatuses(
	components: ProductionMaterialSource[],
): ProductionMaterialStatus[] {
	return components.map((component) => ({
		salesOrderId: component.salesOrderId,
		salesItemId: component.salesItemId,
		componentId: component.componentId,
		name:
			component.componentName ||
			component.inventoryVariantSku ||
			"Required material",
		supplierName: component.supplierName?.trim() || null,
		readiness: component.readiness,
		stockStatus: component.stockStatus,
		requiredQty: component.orderedQty,
		availableQty: Math.max(component.allocatedQty, component.receivedQty),
		openInboundQty: Math.max(0, component.inboundQty - component.receivedQty),
		expectedAt: latestExpectedAt(component.inboundEvidence),
		undatedOpenInboundQty: undatedOpenInboundQty(component.inboundEvidence),
	}));
}

export async function loadProductionMaterialStatuses(
	db: Db,
	input: GetSalesProductionPlanInput,
) {
	try {
		const plan = await getSalesProductionPlan(db, input);
		return {
			state: "available" as const,
			materials: buildProductionMaterialStatuses(plan.components),
		};
	} catch {
		return {
			state: "unavailable" as const,
			materials: [],
		};
	}
}

export type ProductionMaterialSummary = {
	state: "ready" | "pending" | "not_configured" | "unavailable";
	totalCount: number;
	pendingCount: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
	undatedPendingCount: number;
};

export function unavailableProductionMaterialSummary(): ProductionMaterialSummary {
	return {
		state: "unavailable",
		totalCount: 0,
		pendingCount: 0,
		openInboundQty: 0,
		expectedAt: null,
		undatedPendingCount: 0,
	};
}

export function summarizeProductionMaterials(
	materials: ProductionMaterialStatus[],
): ProductionMaterialSummary {
	const pending = materials.filter(
		(material) =>
			material.readiness !== "ready_for_production" &&
			material.readiness !== "fulfilled",
	);
	const expectedAt =
		pending
			.map((material) => material.expectedAt)
			.filter((value): value is Date | string => value != null)
			.map((value) => ({
				value,
				time: new Date(value).getTime(),
			}))
			.filter((item) => Number.isFinite(item.time))
			.reduce<{ value: Date | string; time: number } | undefined>(
				(latest, item) => (!latest || item.time > latest.time ? item : latest),
				undefined,
			)?.value ?? null;

	return {
		state: materials.length
			? pending.length
				? "pending"
				: "ready"
			: "not_configured",
		totalCount: materials.length,
		pendingCount: pending.length,
		openInboundQty: pending.reduce(
			(total, material) => total + material.openInboundQty,
			0,
		),
		expectedAt,
		undatedPendingCount: pending.filter(
			(material) => !material.expectedAt || material.undatedOpenInboundQty > 0,
		).length,
	};
}
