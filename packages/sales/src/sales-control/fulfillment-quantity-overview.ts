import { projectPersistedFulfillmentQuantities } from "../fulfillment-assignment-scope";
import type { FulfillmentQuantity } from "../fulfillment-quantities";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
function quantity(q: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
}): FulfillmentQuantity {
	const lh = q.lh ?? 0,
		rh = q.rh ?? 0;
	return { qty: lh || rh ? 0 : (q.qty ?? 0), lh, rh };
}

/** Adapts legacy control identity without guessing between sizes of the same sales item. */
export function buildFulfillmentQuantityOverview(input: {
	excludeDeliveryId?: number;
	items: Array<{
		controlUid: string;
		itemId: number;
		title?: string | null;
		size?: string | null;
		qty: { qty?: number | null; lh?: number | null; rh?: number | null };
		itemConfig: { shipping?: boolean | null };
	}>;
	headers: Array<{
		id: number;
		status: string | null;
		meta: unknown;
		_count: { stockAllocations: number };
	}>;
	packing: Array<{
		orderDeliveryId: number | null;
		orderItemId: number;
		packingStatus: string | null;
		qty: number;
		lhQty: number | null;
		rhQty: number | null;
		submission: {
			assignment: { salesItemControlUid: string | null } | null;
		} | null;
	}>;
}) {
	const items = input.items.filter((item) => item.itemConfig.shipping === true);
	const sourceConflicts: Array<{ code: string; deliveryId: number }> = [];
	const deliveries = input.headers.map((header) => {
		const meta = record(header.meta);
		const packed = input.packing
			.filter(
				(row) =>
					row.orderDeliveryId === header.id && row.packingStatus === "packed",
			)
			.flatMap((row) => {
				const directUid = row.submission?.assignment?.salesItemControlUid;
				const candidates = items.filter(
					(item) =>
						item.itemId === row.orderItemId &&
						(!directUid || item.controlUid === directUid),
				);
				if (candidates.length !== 1) {
					sourceConflicts.push({
						code: "PACKING_LINE_IDENTITY_UNKNOWN",
						deliveryId: header.id,
					});
					return [];
				}
				return [
					{
						uid: candidates[0]!.controlUid,
						quantity: quantity({ qty: row.qty, lh: row.lhQty, rh: row.rhQty }),
					},
				];
			});
		// The inventory command materializes sales-unit packing rows after component
		// allocation. Reuse those rows; never add component quantities to them.
		if (header._count.stockAllocations > 0 && packed.length === 0)
			sourceConflicts.push({
				code: "INVENTORY_LINE_RECONCILIATION_REQUIRED",
				deliveryId: header.id,
			});
		return {
			...header,
			packed,
			proofCompleted: record(meta.dispatchCompletion).status === "completed",
			inventoryCommitted:
				header._count.stockAllocations === 0 ||
				record(meta.inventoryDispatch).status === "consumed",
		};
	});
	const projection = projectPersistedFulfillmentQuantities({
		excludeDeliveryId: input.excludeDeliveryId,
		lines: items.map((item) => ({
			uid: item.controlUid,
			salesItemId: item.itemId,
			title: item.title ?? null,
			size: item.size ?? null,
			ordered: quantity(item.qty),
		})),
		deliveries,
	});
	const activeIds = new Set(
		input.headers
			.filter(
				(row) =>
					!["cancelled", "canceled"].includes(
						row.status?.trim().toLowerCase() || "",
					),
			)
			.map((row) => row.id),
	);
	const conflicts = [
		...projection.conflicts,
		...input.items
			.filter((item) => item.itemConfig.shipping == null)
			.map((item) => ({
				code: "SHIPPING_REQUIREMENT_UNKNOWN",
				uid: item.controlUid,
			})),
		...sourceConflicts.filter((conflict) => activeIds.has(conflict.deliveryId)),
	];
	return conflicts.length
		? {
				...projection,
				resolved: false,
				conflicts,
				backlogQty: 0,
				lines: projection.lines.map((line) => ({
					...line,
					availableToAssign: { qty: 0, lh: 0, rh: 0 },
				})),
			}
		: projection;
}
