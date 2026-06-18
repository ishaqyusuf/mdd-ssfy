import {
	type DoorStoredRow,
	type WorkflowComponentRecord,
	calcWorkflowDoorRow,
	componentLabel,
	profileAdjustedDoorSalesPrice,
} from "@gnd/sales/sales-form-core";

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
			componentTitle: component?.title || null,
		},
	}) as DoorStoredRow;
}

export function buildDoorGroups(
	rows: DoorStoredRow[],
	selectedDoors: WorkflowComponentRecord[],
): DoorGroup[] {
	const groups = new Map<string, DoorGroup>();

	selectedDoors.forEach((component, index) => {
		const key = doorComponentGroupKey(component, index);
		groups.set(key, {
			key,
			title: componentLabel(component.title || component.uid || "Door"),
			component,
			rows: [],
			totalQty: 0,
			totalPrice: 0,
		});
	});

	rows.forEach((row, index) => {
		const key = rowGroupKey(row);
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
		totalPrice: Number(group.totalPrice.toFixed(2)),
	}));
}

function doorComponentGroupKey(
	component: WorkflowComponentRecord,
	index: number,
) {
	const componentId = Number(component.id || 0);
	if (componentId) return `component:${componentId}`;
	return `selected:${component.uid || index}`;
}

function rowGroupKey(row: DoorStoredRow) {
	const componentId = Number(row.stepProductId || 0);
	return componentId ? `component:${componentId}` : "manual";
}

function rowGroupTitle(row: DoorStoredRow, index: number) {
	const meta = row.meta || {};
	const title = meta.componentTitle || row.title || row.doorType;
	if (title) return componentLabel(String(title));
	if (row.stepProductId) return `Door ${row.stepProductId}`;
	return index === 0 ? "House package" : `Saved door ${index + 1}`;
}
