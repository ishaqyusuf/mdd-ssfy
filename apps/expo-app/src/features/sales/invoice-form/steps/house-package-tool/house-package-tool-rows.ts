import {
	type DoorStoredRow,
	type WorkflowComponentRecord,
	type WorkflowStepRecord,
	calcWorkflowDoorRow,
	profileAdjustedDoorSalesPrice,
	readSalesFormObjectMetadata,
	resolveDoorTierPricing,
} from "@gnd/sales/sales-form-core";
import {
	formatWorkflowComponentLabel,
	getWorkflowSelectableTitle,
} from "../../api/workflow-selectable-copy";
import { roundMoney, sumMoney } from "@gnd/sales/payment-system";

export type DoorRowWithIndex = {
	index: number;
	row: DoorStoredRow;
};

export type DoorGroup = {
	key: string;
	title: string;
	component: WorkflowComponentRecord | null;
	rows: DoorRowWithIndex[];
	totalQty: number;
	totalPrice: number;
};

export type HousePackagePricedStep = {
	key: string;
	title: string;
	price: number;
};

type DoorSupplierMeta = {
	supplierUid?: string | null;
};

export function getHousePackagePricedSteps(
	steps: WorkflowStepRecord[],
): HousePackagePricedStep[] {
	return steps.flatMap((step, index) => {
		const title = String(step.step?.title || step.title || "").trim();
		const normalizedTitle = title.toLowerCase();
		const price = Number(step.price || 0);
		if (
			!Number.isFinite(price) ||
			price <= 0 ||
			["item type", "door", "house package tool", "hpt"].includes(
				normalizedTitle,
			)
		) {
			return [];
		}
		return [
			{
				key: `${step.stepId || step.step?.id || index}:${step.value || title}`,
				title: title || "Component",
				price,
			},
		];
	});
}

export function createHousePackageDoorRow(
	component?: WorkflowComponentRecord | null,
	profileCoefficient?: number | null,
): DoorStoredRow {
	const baseUnitPrice =
		component?.basePrice == null ? null : Number(component.basePrice || 0);
	const salesUnitPrice = profileAdjustedDoorSalesPrice(
		component?.salesPrice,
		component?.basePrice,
		profileCoefficient,
	);
	return calcWorkflowDoorRow({
		id: null,
		dimension: "",
		swing: "",
		doorType: "",
		doorPrice: 0,
		jambSizePrice: salesUnitPrice,
		casingPrice: 0,
		unitPrice: salesUnitPrice,
		lhQty: 0,
		rhQty: 0,
		totalQty: 0,
		lineTotal: 0,
		stepProductId: component?.id || null,
		meta: {
			...(baseUnitPrice != null ? { baseUnitPrice } : {}),
			doorSalesUnitPrice: salesUnitPrice,
			componentUid: component?.uid || null,
			componentTitle: component
				? getDoorGroupComponentStoredTitle(component)
				: null,
		},
	}) as DoorStoredRow;
}

export function createHousePackageAvailableDoorSizeRow({
	component,
	size,
	supplierMeta,
	sharedDoorSurcharge,
	salesMultiplier,
}: {
	component: WorkflowComponentRecord;
	size: string;
	supplierMeta?: DoorSupplierMeta | null;
	sharedDoorSurcharge: number;
	salesMultiplier?: number | null;
}): DoorStoredRow {
	const tierPricing = resolveDoorTierPricing({
		pricing: readObject(component.pricing),
		size,
		supplierUid: supplierMeta?.supplierUid || null,
		supplierVariants: Array.isArray(component.supplierVariants)
			? component.supplierVariants
			: [],
		salesMultiplier: salesMultiplier || 1,
		fallbackSalesPrice:
			component.salesPrice == null ? null : Number(component.salesPrice || 0),
		fallbackBasePrice:
			component.basePrice == null ? null : Number(component.basePrice || 0),
	});
	const hasResolvedPrice = Boolean(tierPricing.hasPrice);
	const salesUnitPrice = hasResolvedPrice
		? roundMoney(tierPricing.salesPrice)
		: 0;
	return calcWorkflowDoorRow({
		id: null,
		dimension: size,
		swing: "",
		doorType: "",
		doorPrice: 0,
		jambSizePrice: salesUnitPrice,
		casingPrice: 0,
		unitPrice: hasResolvedPrice
			? sumMoney([tierPricing.salesPrice, sharedDoorSurcharge])
			: 0,
		lhQty: 0,
		rhQty: 0,
		totalQty: 0,
		lineTotal: 0,
		stepProductId: component.id || null,
		meta: {
			baseUnitPrice: hasResolvedPrice ? roundMoney(tierPricing.basePrice) : 0,
			doorSalesUnitPrice: salesUnitPrice,
			sharedDoorSurcharge,
			priceMissing: !hasResolvedPrice,
			componentUid: component.uid || null,
			componentTitle: getDoorGroupComponentStoredTitle(component),
		},
	}) as DoorStoredRow;
}

function readObject(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function buildDoorGroups(
	rows: DoorStoredRow[],
	selectedDoors: WorkflowComponentRecord[],
): DoorGroup[] {
	const groups = new Map<string, DoorGroup>();
	const singleSelectedDoor =
		selectedDoors.length === 1 ? selectedDoors[0] : null;
	const singleSelectedDoorKey = singleSelectedDoor
		? doorComponentGroupKey(singleSelectedDoor, 0)
		: null;

	selectedDoors.forEach((component, index) => {
		const key = doorComponentGroupKey(component, index);
		groups.set(key, {
			key,
			title: getDoorGroupComponentDisplayTitle(component),
			component,
			rows: [],
			totalQty: 0,
			totalPrice: 0,
		});
	});

	rows.forEach((row, index) => {
		const key = rowGroupKey(row, singleSelectedDoorKey);
		if (!groups.has(key)) {
			groups.set(key, {
				key,
				title: rowGroupTitle(row, index),
				component: null,
				rows: [],
				totalQty: 0,
				totalPrice: 0,
			});
		}
		const group = groups.get(key);
		if (!group) return;
		group.rows.push({ index, row });
		group.totalQty += Number(row.totalQty || 0);
		group.totalPrice += Number(row.lineTotal || 0);
	});

	if (!groups.size) {
		groups.set("manual", {
			key: "manual",
			title: "House package",
			component: null,
			rows: [],
			totalQty: 0,
			totalPrice: 0,
		});
	}

	return Array.from(groups.values()).map((group) => ({
		...group,
		totalPrice: roundMoney(group.totalPrice),
	}));
}

export function canRemoveHousePackageDoorOption(input: {
	selectedDoors?: WorkflowComponentRecord[] | null;
	disabled?: boolean;
	hasRemoveHandler?: boolean;
}) {
	if (input.disabled) return false;
	if (!input.hasRemoveHandler) return false;
	const selectedCount = (input.selectedDoors || []).filter((component) =>
		String(component?.uid || component?.id || "").trim(),
	).length;
	return selectedCount > 1;
}

function doorComponentGroupKey(
	component: WorkflowComponentRecord,
	index: number,
) {
	const componentId = Number(component.id || 0);
	if (componentId) return `component:${componentId}`;
	return `selected:${component.uid || index}`;
}

function rowGroupKey(
	row: DoorStoredRow,
	singleSelectedDoorKey?: string | null,
) {
	const componentId = Number(row.stepProductId || 0);
	if (componentId) return `component:${componentId}`;
	const meta = readSalesFormObjectMetadata(row.meta) || {};
	const componentUid = String(meta?.componentUid || "").trim();
	if (componentUid) return `selected:${componentUid}`;
	return singleSelectedDoorKey || "manual";
}

function rowGroupTitle(row: DoorStoredRow, index: number) {
	const meta = readSalesFormObjectMetadata(row.meta) || {};
	const title = meta.componentTitle || row.title || row.doorType;
	if (title) {
		const safeTitle = getWorkflowSelectableTitle({
			title: String(title),
			value: String(row.doorType || ""),
		} as WorkflowComponentRecord);
		return safeTitle === "Component"
			? "DOOR"
			: formatWorkflowComponentLabel(safeTitle);
	}
	if (row.stepProductId) return `Door ${row.stepProductId}`;
	return index === 0 ? "House package" : `Saved door ${index + 1}`;
}

function getDoorGroupComponentStoredTitle(component: WorkflowComponentRecord) {
	const title = getWorkflowSelectableTitle(component);
	return title === "Component" ? "Door" : title;
}

function getDoorGroupComponentDisplayTitle(component: WorkflowComponentRecord) {
	return formatWorkflowComponentLabel(
		getDoorGroupComponentStoredTitle(component),
	);
}
