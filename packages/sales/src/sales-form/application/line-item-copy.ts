import {
	type SalesFormLineItemRecord,
	createSalesFormLineItemUid,
	normalizeSalesFormLineItem,
} from "./record-normalization";

function cloneJsonValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((item) => cloneJsonValue(item)) as T;
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]),
		) as T;
	}
	return value;
}

function clearGroupedRowPersistenceIds(
	value: unknown,
	groupUid?: string | null,
) {
	if (!Array.isArray(value)) return value;
	return value.map((row) => {
		if (!row || typeof row !== "object" || Array.isArray(row)) return row;
		return {
			...cloneJsonValue(row),
			id: null,
			salesItemId: null,
			hptId: null,
			...(groupUid ? { groupUid } : {}),
		};
	});
}

function clearOwnedRelationIds<T extends Record<string, unknown>>(
	value: T,
	fields: string[],
): T {
	const next: Record<string, unknown> = cloneJsonValue(value);
	for (const field of fields) next[field] = null;
	return next as T;
}

export function clearSalesFormLineItemPersistenceIds(
	line: SalesFormLineItemRecord,
	options?: { uid?: string },
): SalesFormLineItemRecord {
	const uid = options?.uid || String(line.uid || "");
	const sourceMeta = cloneJsonValue(line.meta || {});
	const isGrouped =
		Array.isArray(sourceMeta.mouldingRows) ||
		Array.isArray(sourceMeta.serviceRows);
	const groupUid = isGrouped && options?.uid ? uid : null;
	const housePackageTool = line.housePackageTool
		? clearOwnedRelationIds(line.housePackageTool, [
				"id",
				"orderItemId",
				"salesOrderId",
			])
		: null;

	return {
		...cloneJsonValue(line),
		id: null,
		...(options?.uid ? { uid } : {}),
		multiDykeUid: null,
		multiDyke: null,
		meta: {
			...sourceMeta,
			...(groupUid ? { groupUid } : {}),
			mouldingRows: clearGroupedRowPersistenceIds(
				sourceMeta.mouldingRows,
				groupUid,
			),
			serviceRows: clearGroupedRowPersistenceIds(
				sourceMeta.serviceRows,
				groupUid,
			),
		},
		formSteps: (line.formSteps || []).map((step) =>
			clearOwnedRelationIds(step, ["id", "salesId", "salesItemId"]),
		),
		shelfItems: (line.shelfItems || []).map((item) =>
			clearOwnedRelationIds(item, ["id", "salesOrderItemId"]),
		),
		housePackageTool: housePackageTool
			? {
					...housePackageTool,
					meta: {
						...cloneJsonValue(housePackageTool.meta || {}),
						legacyGroupUid: groupUid,
						legacySalesItemId: null,
						legacyHptId: null,
					},
					doors: (
						(line.housePackageTool?.doors || []) as Array<
							Record<string, unknown>
						>
					).map((door) =>
						clearOwnedRelationIds(door, [
							"id",
							"housePackageToolId",
							"salesOrderId",
							"salesOrderItemId",
						]),
					),
				}
			: null,
	};
}

export function duplicateSalesFormLineItemRecord(
	line: SalesFormLineItemRecord,
	index: number,
) {
	const uid = createSalesFormLineItemUid(index);
	return normalizeSalesFormLineItem(
		clearSalesFormLineItemPersistenceIds(line, { uid }),
		index,
	);
}
