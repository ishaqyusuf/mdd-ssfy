type UnknownRecord = Record<string, unknown>;

export const LEGACY_ADJUSTMENT_SAVE_BLOCKED =
	"This order is governed by an approved change. Continue in the new sales form to make further changes.";

function safeRecord(value: unknown): UnknownRecord {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as UnknownRecord;
}

function finiteNumber(value: unknown): number | null {
	if (value == null || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function normalizedText(value: unknown) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function itemUid(item: UnknownRecord) {
	const itemMeta = safeRecord(item.meta);
	const nestedMeta = safeRecord(itemMeta.meta);
	return String(
		itemMeta.uid || nestedMeta.uid || (item.id ? `sales-item-${item.id}` : ""),
	).trim();
}

function persistedLineForItem(item: UnknownRecord, lines: UnknownRecord[]) {
	const uid = itemUid(item);
	return (
		lines.find(
			(line) => Number(line.id || 0) > 0 && Number(line.id) === Number(item.id),
		) || lines.find((line) => uid && String(line.uid || "").trim() === uid)
	);
}

function matchingLegacyDoor(
	legacyDoors: UnknownRecord[],
	persistedDoor: UnknownRecord,
) {
	const persistedId = Number(persistedDoor.id || 0);
	const persistedDimension = normalizedText(persistedDoor.dimension);
	const persistedStepProductId = Number(persistedDoor.stepProductId || 0);

	return (
		legacyDoors.find(
			(door) => persistedId > 0 && Number(door.id || 0) === persistedId,
		) ||
		legacyDoors.find((door) => {
			if (
				!persistedDimension ||
				normalizedText(door.dimension) !== persistedDimension
			) {
				return false;
			}
			return (
				!persistedStepProductId ||
				Number(door.stepProductId || 0) === persistedStepProductId
			);
		})
	);
}

export function hasApprovedAdjustmentSnapshot(meta: unknown) {
	const newSalesForm = safeRecord(safeRecord(meta).newSalesForm);
	return Boolean(
		newSalesForm.approvedAdjustmentId && Array.isArray(newSalesForm.lineItems),
	);
}

export function assertLegacySalesFormWritable(meta: unknown) {
	if (hasApprovedAdjustmentSnapshot(meta)) {
		throw new Error(LEGACY_ADJUSTMENT_SAVE_BLOCKED);
	}
}

/**
 * Applied-adjustment door membership is owned by the persisted new-form
 * snapshot. Relational rows may enrich retained rows but cannot restore removed
 * rows or overwrite approved commercial values.
 */
export function projectApprovedAdjustmentDoorRows(
	persistedRows: unknown,
	legacyRows: unknown,
) {
	if (!Array.isArray(persistedRows)) {
		return Array.isArray(legacyRows) ? legacyRows : [];
	}
	const legacy = (Array.isArray(legacyRows) ? legacyRows : []).map(safeRecord);
	return persistedRows.map((value) => {
		const persistedDoor = safeRecord(value);
		const legacyDoor = matchingLegacyDoor(legacy, persistedDoor);
		return {
			...(legacyDoor || {}),
			...persistedDoor,
			meta: {
				...safeRecord(legacyDoor?.meta),
				...safeRecord(persistedDoor.meta),
			},
		};
	});
}

export function projectApprovedAdjustmentLegacyOrder<
	TOrder extends UnknownRecord,
>(
	order: TOrder,
): {
	order: TOrder;
	adjustmentSnapshotAuthority: boolean;
	totalWithCcc: number | null;
} {
	const orderMeta = safeRecord(order.meta);
	const newSalesForm = safeRecord(orderMeta.newSalesForm);
	if (!hasApprovedAdjustmentSnapshot(orderMeta)) {
		return {
			order,
			adjustmentSnapshotAuthority: false,
			totalWithCcc: null,
		};
	}

	const persistedLines = (newSalesForm.lineItems as unknown[]).map(safeRecord);
	const items = (Array.isArray(order.items) ? order.items : []).map(
		(itemValue: unknown) => {
			const item = safeRecord(itemValue);
			const persistedLine = persistedLineForItem(item, persistedLines);
			if (!persistedLine) return itemValue;

			const persistedHptValue = persistedLine.housePackageTool;
			const legacyHpt = safeRecord(item.housePackageTool);
			let housePackageTool = item.housePackageTool;
			if (persistedHptValue === null) {
				housePackageTool = null;
			} else {
				const persistedHpt = safeRecord(persistedHptValue);
				if (Object.keys(persistedHpt).length) {
					housePackageTool = {
						...legacyHpt,
						...persistedHpt,
						meta: {
							...safeRecord(legacyHpt.meta),
							...safeRecord(persistedHpt.meta),
						},
						...(Array.isArray(persistedHpt.doors)
							? {
									doors: projectApprovedAdjustmentDoorRows(
										persistedHpt.doors,
										legacyHpt.doors,
									),
								}
							: {}),
					};
				}
			}

			const qty = finiteNumber(persistedLine.qty);
			const unitPrice = finiteNumber(persistedLine.unitPrice);
			const lineTotal = finiteNumber(persistedLine.lineTotal);
			return {
				...item,
				...(qty == null ? {} : { qty }),
				...(unitPrice == null ? {} : { rate: unitPrice }),
				...(lineTotal == null ? {} : { total: lineTotal }),
				housePackageTool,
			};
		},
	);

	const summary = safeRecord(newSalesForm.summary);
	const subTotal = finiteNumber(summary.subTotal);
	const tax = finiteNumber(summary.taxTotal);
	const grandTotal = finiteNumber(summary.grandTotal);
	const ccc = finiteNumber(summary.ccc);
	const totalWithCcc = finiteNumber(summary.totalWithCcc);

	return {
		order: {
			...order,
			items,
			...(subTotal == null ? {} : { subTotal }),
			...(tax == null ? {} : { tax }),
			...(grandTotal == null ? {} : { grandTotal }),
			meta: {
				...orderMeta,
				...(ccc == null ? {} : { ccc }),
			},
		} as TOrder,
		adjustmentSnapshotAuthority: true,
		totalWithCcc,
	};
}
