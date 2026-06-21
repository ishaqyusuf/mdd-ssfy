import {
	type DoorStoredRow,
	type ShelfProductOption,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
	getRouteConfigForLine,
	type getWorkflowSteps,
	isDoorStepTitle,
	isHousePackageToolStepTitle,
	profileAdjustedDoorSalesPrice,
	readSalesFormObjectMetadata,
} from "@gnd/sales/sales-form-core";
import { getWorkflowSelectableTitle } from "../api/workflow-selectable-copy";
import type { NewSalesFormLineItem } from "../types";

export function getDoorRows(item: WorkflowLineItemRecord) {
	const housePackageTool = item.housePackageTool as
		| { doors?: DoorStoredRow[] | null }
		| null
		| undefined;
	return Array.isArray(housePackageTool?.doors) ? housePackageTool.doors : [];
}

export function getDoorRouteConfig(
	item: WorkflowLineItemRecord,
	steps: ReturnType<typeof getWorkflowSteps>,
) {
	const hptStep = steps.find((step) =>
		isHousePackageToolStepTitle(step.step?.title || step.title),
	);
	const doorStep = steps.find((step) =>
		isDoorStepTitle(step.step?.title || step.title),
	);
	const stepForConfig = doorStep || hptStep;
	if (!stepForConfig) return null;
	const doorStepMeta = readSalesFormObjectMetadata(doorStep?.meta);
	const selectedComponents = Array.isArray(doorStepMeta?.selectedComponents)
		? doorStepMeta.selectedComponents
		: [];
	const storedRouteConfig = readStoredDoorRouteConfig(item);
	const stepRouteConfig = getRouteConfigForLine({
		routeData: null,
		line: item,
		step: stepForConfig,
		component: selectedComponents[0] || null,
	});
	return {
		...storedRouteConfig,
		...stepRouteConfig,
	};
}

export function getMobileDoorRouteFlags(
	routeConfig?: { noHandle?: unknown; hasSwing?: unknown } | null,
) {
	return {
		noHandle: routeConfig?.noHandle === true,
		hasSwing: routeConfig?.hasSwing === true,
	};
}

export function getSelectedDoorComponents(
	steps: ReturnType<typeof getWorkflowSteps>,
): WorkflowComponentRecord[] {
	const doorStep = steps.find((step) =>
		isDoorStepTitle(step.step?.title || step.title),
	);
	const doorStepMeta = readSalesFormObjectMetadata(doorStep?.meta);
	const selectedComponents = Array.isArray(doorStepMeta?.selectedComponents)
		? doorStepMeta.selectedComponents
		: [];
	return selectedComponents.filter(Boolean) as WorkflowComponentRecord[];
}

export function mapShelfProduct(
  row: unknown,
  profileCoefficient?: number | null,
): ShelfProductOption {
	const product = (row || {}) as Record<string, unknown>;
	const categoryPath = Array.isArray(product.categoryPath)
		? product.categoryPath
		: [];
	const baseUnitPrice =
		product.unitPrice == null ? null : Number(product.unitPrice || 0);
	const displayUnitPrice = profileAdjustedDoorSalesPrice(
		product.salesPrice == null
			? baseUnitPrice
			: Number(product.salesPrice || 0),
		baseUnitPrice,
		profileCoefficient,
	);
	return {
		...product,
		id: product.id == null ? null : Number(product.id || 0),
		title: String(product.title || "Shelf product"),
		unitPrice: baseUnitPrice,
		salesPrice: displayUnitPrice,
		categoryId:
			product.categoryId == null ? null : Number(product.categoryId || 0),
		parentCategoryId:
			product.parentCategoryId == null
				? null
				: Number(product.parentCategoryId || 0),
		categoryPath: categoryPath.map((entry) =>
			typeof entry === "object" && entry
				? {
						...entry,
						id: Number((entry as { id?: unknown }).id || 0),
					}
				: { id: Number(entry || 0) },
		),
	};
}

export function mapWorkflowComponent(row: unknown): WorkflowComponentRecord {
	const component = (row || {}) as WorkflowComponentRecord &
		Record<string, unknown>;
	return {
		...component,
		id: component.id == null ? null : Number(component.id || 0),
		uid: String(component.uid || component.id || ""),
		title: getWorkflowSelectableTitle(component),
		salesPrice:
			component.salesPrice == null ? null : Number(component.salesPrice || 0),
		basePrice:
			component.basePrice == null ? null : Number(component.basePrice || 0),
	};
}

export function linePatchChanged(
	line: NewSalesFormLineItem,
	patch: Partial<NewSalesFormLineItem>,
) {
	return Object.entries(patch).some(([key, value]) => {
		const current = (line as Record<string, unknown>)[key];
		return JSON.stringify(current ?? null) !== JSON.stringify(value ?? null);
	});
}

function readStoredDoorRouteConfig(item: WorkflowLineItemRecord) {
	const meta = readSalesFormObjectMetadata(item.meta) || {};
	const config = meta.workflowDoorRouteConfig;
	if (!config || typeof config !== "object" || Array.isArray(config)) {
		return {};
	}
	const routeConfig = config as {
		noHandle?: unknown;
		hasSwing?: unknown;
	};
	return {
		...(typeof routeConfig.noHandle === "boolean"
			? { noHandle: routeConfig.noHandle }
			: {}),
		...(typeof routeConfig.hasSwing === "boolean"
			? { hasSwing: routeConfig.hasSwing }
			: {}),
	};
}
