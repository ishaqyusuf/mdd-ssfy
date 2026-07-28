import type { NewSalesFormRecord } from "./schema";

function clearGroupedRowPersistenceIds(value: unknown) {
	if (!Array.isArray(value)) return value;
	return value.map((row) => {
		if (!row || typeof row !== "object" || Array.isArray(row)) return row;
		return {
			...row,
			id: null,
			salesItemId: null,
			hptId: null,
		};
	});
}

function clearLinePersistenceIds(
	line: NewSalesFormRecord["lineItems"][number],
) {
	const meta = (line.meta || {}) as Record<string, unknown>;
	return {
		...line,
		id: null,
		meta: {
			...meta,
			mouldingRows: clearGroupedRowPersistenceIds(meta.mouldingRows),
			serviceRows: clearGroupedRowPersistenceIds(meta.serviceRows),
		},
		formSteps: (line.formSteps || []).map((step) => ({
			...step,
			id: null,
		})),
		shelfItems: (line.shelfItems || []).map((item) => ({
			...item,
			id: null,
		})),
		housePackageTool: line.housePackageTool
			? {
					...line.housePackageTool,
					id: null,
					doors: (line.housePackageTool.doors || []).map((door) => ({
						...door,
						id: null,
					})),
				}
			: null,
	};
}

export function createSalesHistoryRestoreRecord(
	current: NewSalesFormRecord,
	snapshot: NewSalesFormRecord,
): NewSalesFormRecord {
	return {
		...snapshot,
		salesId: current.salesId,
		slug: current.slug,
		orderId: current.orderId,
		type: current.type,
		status: current.status,
		inventoryStatus: current.inventoryStatus,
		version: current.version,
		updatedAt: current.updatedAt,
		settings: current.settings,
		paymentTotal: current.paymentTotal,
		paymentCount: current.paymentCount,
		paymentMethodReviewDismissed: current.paymentMethodReviewDismissed,
		lineItems: snapshot.lineItems.map(clearLinePersistenceIds),
		extraCosts: snapshot.extraCosts.map((cost) => ({
			...cost,
			id: null,
		})),
	};
}
