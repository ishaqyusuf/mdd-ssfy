import type { Db } from "@gnd/db";

import { resolveItemMaterialStatus } from "../../item-material-status";
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
	inventoryVariantUid: string | null;
	supplierName: string | null;
	readiness: SalesProductionReadiness;
	stockStatus: SalesProductionStockStatus;
	requiredQty: number;
	availableQty: number;
	allocatedQty: number;
	pendingReviewQty: number;
	receivedQty: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
	undatedOpenInboundQty: number;
	productionEligibilityConflict: boolean;
	inbounds: Array<{
		id: number | null;
		status: string;
		expectedAt: Date | string | null;
		supplierName: string | null;
		quantity: number;
	}>;
};

export function buildProductionItemMaterialStatus(input: {
	salesOrderId: number;
	salesItemId: number;
	configuredProduction?: boolean | null;
	productionItemDimension?: string | null;
	hasOperationalProduction: boolean;
	reviewPending: boolean;
	projectionState: "available" | "unavailable";
	materials: ProductionMaterialStatus[];
}) {
	const salesItemMaterials = input.materials.filter(
		(material) => material.salesItemId === input.salesItemId,
	);
	const dimension = input.productionItemDimension
		?.trim()
		.match(/^(\d+-\d+)\s*x\s*(\d+-\d+)$/i);
	const expectedVariantUid = dimension
		? `w${dimension[1]?.replaceAll("-", "_")}-h${dimension[2]?.replaceAll("-", "_")}`
		: null;
	const dimensionMaterials = expectedVariantUid
		? salesItemMaterials.filter(
				(material) => material.inventoryVariantUid === expectedVariantUid,
			)
		: [];
	const itemMaterials = dimensionMaterials.length
		? dimensionMaterials
		: salesItemMaterials;
	return resolveItemMaterialStatus({
		salesOrderId: input.salesOrderId,
		salesItemId: input.salesItemId,
		applicability:
			input.configuredProduction === true
				? "required"
				: input.hasOperationalProduction
					? "conflict"
					: input.configuredProduction === false
						? "not_required"
						: "unknown",
		evidenceAvailable: input.projectionState === "available",
		reviewPending: input.reviewPending,
		components: itemMaterials.map((material) => ({
			componentId: material.componentId,
			name: material.name,
			requiredQty: material.requiredQty,
			receivedQty: material.receivedQty,
			committedAllocatedQty: material.allocatedQty,
			pendingAllocationQty: material.pendingReviewQty,
			openInboundQty: material.openInboundQty,
			readiness: material.readiness,
			eligibilityConflict: material.productionEligibilityConflict,
			inbounds: material.inbounds,
		})),
	});
}

type ProductionMaterialSource = Pick<
	SalesProductionPlanComponent,
	| "salesOrderId"
	| "salesItemId"
	| "componentId"
	| "componentName"
	| "inventoryVariantUid"
	| "inventoryVariantSku"
	| "supplierName"
	| "readiness"
	| "stockStatus"
	| "orderedQty"
	| "allocatedQty"
	| "inboundQty"
	| "receivedQty"
	| "pendingReviewQty"
	| "productionEligibilityConflict"
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
		inventoryVariantUid: component.inventoryVariantUid,
		supplierName: component.supplierName?.trim() || null,
		readiness: component.readiness,
		stockStatus: component.stockStatus,
		requiredQty: component.orderedQty,
		availableQty: Math.max(component.allocatedQty, component.receivedQty),
		allocatedQty: Number(component.allocatedQty || 0),
		pendingReviewQty: Number(component.pendingReviewQty || 0),
		receivedQty: Number(component.receivedQty || 0),
		openInboundQty: Math.max(0, component.inboundQty - component.receivedQty),
		expectedAt: latestExpectedAt(component.inboundEvidence),
		undatedOpenInboundQty: undatedOpenInboundQty(component.inboundEvidence),
		productionEligibilityConflict:
			component.productionEligibilityConflict === true,
		inbounds: component.inboundEvidence.flatMap((evidence) => {
			const quantity = Math.max(0, evidence.qty - evidence.qtyReceived);
			if (quantity <= 0 || evidence.status === "cancelled") return [];
			return [
				{
					id: evidence.inboundShipmentItemId ?? evidence.id,
					status: evidence.shipmentStatus || evidence.status || "pending",
					expectedAt: evidence.expectedAt,
					supplierName:
						evidence.supplierName || component.supplierName?.trim() || null,
					quantity,
				},
			];
		}),
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
