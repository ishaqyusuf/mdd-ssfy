import { AppError } from "@gnd/errors";
import type { Db, TransactionClient } from "@gnd/db";
import { approveStockAllocation } from "@gnd/inventory";

const committedStatuses = [
	"approved",
	"reserved",
	"picked",
	"consumed",
] as const;
type Allocation = {
	id: number;
	qty: number;
	status: string;
	inventoryStockId: number | null;
	inventoryVariantId: number;
};
type Component = {
	id: number;
	qty: number | null;
	inventoryVariantId: number | null;
	stockAllocations: Allocation[];
};
type Stock = { id: number; qty: number | null; inventoryVariantId: number };

export function validateProductionAllocationCoverage(
	components: Component[],
	stocks: Stock[],
	committed: { inventoryStockId: number | null; qty: number }[],
) {
	const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
	const occupied = new Map<number, number>();
	for (const allocation of committed) {
		if (allocation.inventoryStockId != null)
			occupied.set(
				allocation.inventoryStockId,
				(occupied.get(allocation.inventoryStockId) ?? 0) + allocation.qty,
			);
	}
	const ids: number[] = [];
	for (const component of components) {
		const pending = component.stockAllocations.filter(
			(allocation) => allocation.status === "pending_review",
		);
		if (!pending.length) continue;
		if (
			component.stockAllocations.some(
				(allocation) => !Number.isFinite(allocation.qty) || allocation.qty < 0,
			) ||
			component.stockAllocations.reduce(
				(sum, allocation) => sum + allocation.qty,
				0,
			) >
				Number(component.qty) + 0.000001
		)
			throw new AppError({
				code: "CONFLICT",
				publicMessage:
					"Existing allocations exceed material needs. Open Inventory to review them.",
			});
		for (const allocation of pending) {
			const stock = stockById.get(allocation.inventoryStockId ?? -1);
			if (
				!stock ||
				stock.inventoryVariantId !== allocation.inventoryVariantId ||
				allocation.inventoryVariantId !== component.inventoryVariantId
			)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Pending allocation lacks matching physical stock. Open Inventory to review it.",
				});
			const total = (occupied.get(stock.id) ?? 0) + allocation.qty;
			if (!Number.isFinite(stock.qty) || total > Number(stock.qty) + 0.000001)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Pending allocations exceed available physical stock. Open Inventory to review them.",
				});
			occupied.set(stock.id, total);
			ids.push(allocation.id);
		}
	}
	return ids;
}

/** Read-only coverage evidence shared by preview and transactional confirmation. */
export async function getProductionInboundAllocationCoverage(
	tx: Db | TransactionClient,
	componentIds: number[],
	allowPartial = false,
) {
	const components = await tx.lineItemComponents.findMany({
		where: { id: { in: componentIds }, status: { not: "cancelled" } },
		orderBy: { id: "asc" },
		select: {
			id: true,
			qty: true,
			inventoryVariantId: true,
			stockAllocations: {
				orderBy: { id: "asc" },
				where: {
					deletedAt: null,
					status: { in: ["pending_review", ...committedStatuses] },
				},
				select: {
					id: true,
					qty: true,
					status: true,
					inventoryStockId: true,
					inventoryVariantId: true,
				},
			},
		},
	});
	const stockIds = [
		...new Set(
			components.flatMap((component) =>
				component.stockAllocations
					.filter((allocation) => allocation.status === "pending_review")
					.flatMap((allocation) =>
						allocation.inventoryStockId == null
							? []
							: [allocation.inventoryStockId],
					),
			),
		),
	];
	const [stocks, committed] = await Promise.all([
		tx.inventoryStock.findMany({
			where: { id: { in: stockIds }, deletedAt: null },
			orderBy: { id: "asc" },
			select: { id: true, qty: true, inventoryVariantId: true },
		}),
		tx.stockAllocation.findMany({
			where: {
				inventoryStockId: { in: stockIds },
				deletedAt: null,
				status: { in: [...committedStatuses] },
			},
			select: { inventoryStockId: true, qty: true },
			orderBy: { id: "asc" },
		}),
	]);
	const { ids, blockedComponentIds } = planProductionAllocationCoverage(components, stocks, committed, allowPartial);
	return { ids, components, stocks, committed, blockedComponentIds };
}

export function planProductionAllocationCoverage(
	components: Component[], stocks: Stock[],
	committed: {inventoryStockId: number | null; qty: number}[], allowPartial: boolean,
) {
	const ids: number[] = [];
	const blockedComponentIds: number[] = [];
	if (!allowPartial) ids.push(...validateProductionAllocationCoverage(components, stocks, committed));
	else {
		const occupied = [...committed];
		for (const component of components) {
			try {
				const approvedIds = validateProductionAllocationCoverage([component], stocks, occupied);
				ids.push(...approvedIds);
				occupied.push(...component.stockAllocations.filter(allocation => approvedIds.includes(allocation.id)).map(allocation => ({inventoryStockId:allocation.inventoryStockId,qty:allocation.qty})));
			} catch (error) {
				if (!(error instanceof AppError)) throw error;
				blockedComponentIds.push(component.id);
			}
		}
	}
	return { ids, blockedComponentIds };
}

// Called inside a serializable material transaction, before reserving more stock.
export async function confirmProductionInboundAllocations(
	tx: TransactionClient,
	componentIds: number[],
	notes = "Physical stock verified during production inbound receipt.",
) {
	const { ids } = await getProductionInboundAllocationCoverage(tx, componentIds);
	for (const id of ids) {
		const result = await approveStockAllocation(tx as Db, {
			allocationId: id,
			notes,
		});
		if (result.skipped)
			throw new AppError({
				code: "CONFLICT",
				publicMessage:
					"Allocation evidence changed. Refresh and retry receiving.",
			});
	}
	return ids;
}
