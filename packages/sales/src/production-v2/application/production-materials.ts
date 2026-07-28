import type {
	SalesProductionPlanComponent,
	SalesProductionReadiness,
	SalesProductionStockStatus,
} from "../../sales-fulfillment-plan";

export type ProductionMaterialStatus = {
	salesOrderId: number | null;
	salesItemId: number | null;
	componentId: number | null;
	name: string;
	readiness: SalesProductionReadiness;
	stockStatus: SalesProductionStockStatus;
	requiredQty: number;
	availableQty: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
};

type ProductionMaterialSource = Pick<
	SalesProductionPlanComponent,
	| "salesOrderId"
	| "salesItemId"
	| "componentId"
	| "componentName"
	| "inventoryVariantSku"
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
		readiness: component.readiness,
		stockStatus: component.stockStatus,
		requiredQty: component.orderedQty,
		availableQty: Math.max(component.allocatedQty, component.receivedQty),
		openInboundQty: Math.max(0, component.inboundQty - component.receivedQty),
		expectedAt: latestExpectedAt(component.inboundEvidence),
	}));
}

export type ProductionMaterialSummary = {
	state: "ready" | "pending" | "not_configured";
	totalCount: number;
	pendingCount: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
};

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
	};
}
