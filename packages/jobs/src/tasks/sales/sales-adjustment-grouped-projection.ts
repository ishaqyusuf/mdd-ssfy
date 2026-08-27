import type { TransactionClient } from "@gnd/db";
import { expandGroupedLineForLegacySave } from "@gnd/sales/sales-form";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function groupedRowUnitPrice(
	kind: "moulding" | "service",
	row: Record<string, unknown>,
) {
	if (kind === "service") return Number(row.unitPrice || 0);
	const addon = Number(row.addon || 0);
	return row.customPrice == null || row.customPrice === ""
		? Number(row.salesPrice || 0) + addon
		: Number(row.customPrice || 0) + addon;
}

function groupedRowDescription(
	kind: "moulding" | "service",
	row: Record<string, unknown>,
) {
	return kind === "service"
		? String(row.service || row.description || "").trim()
		: String(row.description || row.title || "Moulding").trim();
}

async function projectApprovedMouldingRow(input: {
	tx: TransactionClient;
	salesOrderItemId: number;
	row: Record<string, unknown>;
	rowTotal: number;
}) {
	const hpt = await input.tx.housePackageTools.findUnique({
		where: { orderItemId: input.salesOrderItemId },
		select: { id: true, meta: true },
	});
	if (!hpt) {
		throw new Error(
			`Approved grouped moulding row ${input.salesOrderItemId} is missing its house-package row.`,
		);
	}

	const hptMeta = record(hpt.meta);
	const priceTags = record(hptMeta.priceTags);
	const mouldingTag = record(priceTags.moulding);
	await input.tx.housePackageTools.update({
		where: { id: hpt.id },
		data: {
			moldingId: Number(input.row.mouldingProductId || 0) || null,
			stepProductId: Number(input.row.stepProductId || 0) || null,
			totalPrice: input.rowTotal,
			totalDoors: 0,
			meta: {
				...hptMeta,
				priceTags: {
					...priceTags,
					moulding: {
						...mouldingTag,
						addon: Number(input.row.addon || 0),
						overridePrice:
							input.row.customPrice == null || input.row.customPrice === ""
								? null
								: Number(input.row.customPrice || 0),
						salesPrice: Number(input.row.salesPrice || 0),
						basePrice: Number(input.row.basePrice || 0),
						price: groupedRowUnitPrice("moulding", input.row),
						laborQty: input.row.laborQty ?? null,
						unitLabor: input.row.unitLabor ?? null,
					},
				},
			},
		},
	});
}

export async function projectApprovedGroupedSalesLine(input: {
	tx: TransactionClient;
	salesOrderId: number;
	line: Record<string, unknown>;
	persistedItemIds: Set<number>;
}) {
	const expanded = expandGroupedLineForLegacySave(input.line);
	if (!expanded.some((entry) => entry.kind != null)) return false;
	const retainedItemIdsByGroup = new Map<string, Set<number>>();

	for (const entry of expanded) {
		if (!entry.kind || !entry.row) continue;
		const row = record(entry.row);
		const groupUid = String(entry.groupUid || "").trim();
		if (!groupUid) {
			throw new Error(
				`Approved grouped ${entry.kind} row is missing its persisted group identity.`,
			);
		}
		const salesOrderItemId = Number(row.salesItemId || 0);
		if (!input.persistedItemIds.has(salesOrderItemId)) {
			throw new Error(
				`Approved grouped ${entry.kind} row is missing its persisted sales-item identity.`,
			);
		}
		const retainedItemIds =
			retainedItemIdsByGroup.get(groupUid) || new Set<number>();
		retainedItemIds.add(salesOrderItemId);
		retainedItemIdsByGroup.set(groupUid, retainedItemIds);

		const qty = Number(row.qty || 0);
		const rate = groupedRowUnitPrice(entry.kind, row);
		const total = Number.isFinite(Number(row.lineTotal))
			? Number(row.lineTotal || 0)
			: qty * rate;
		const description = groupedRowDescription(entry.kind, row);
		const rowUid = String(row.uid || "").trim();
		await input.tx.salesOrderItems.update({
			where: { id: salesOrderItemId },
			data: {
				salesOrderId: input.salesOrderId,
				description,
				qty,
				rate,
				total,
				multiDykeUid: groupUid,
				multiDyke: entry.primaryGroupItem,
				dykeProduction:
					entry.kind === "service" ? Boolean(row.produceable) : false,
				meta: {
					uid: rowUid,
					title: input.line.title || null,
					description,
					meta: record(input.line.meta),
					...(entry.kind === "service" ? { tax: Boolean(row.taxxable) } : {}),
				},
				deletedAt: null,
			},
		});

		if (entry.kind === "moulding") {
			await projectApprovedMouldingRow({
				tx: input.tx,
				salesOrderItemId,
				row,
				rowTotal: total,
			});
		}
	}

	const retiredAt = new Date();
	for (const [groupUid, retainedItemIds] of retainedItemIdsByGroup) {
		const omittedItemFilter = {
			salesOrderId: input.salesOrderId,
			multiDykeUid: groupUid,
			deletedAt: null,
			id: { notIn: [...retainedItemIds] },
		};
		await input.tx.dykeSalesDoors.updateMany({
			where: {
				deletedAt: null,
				salesOrderItem: omittedItemFilter,
			},
			data: { deletedAt: retiredAt, activeIdentity: null },
		});
		await input.tx.housePackageTools.updateMany({
			where: {
				deletedAt: null,
				salesOrderItem: omittedItemFilter,
			},
			data: { deletedAt: retiredAt },
		});
		await input.tx.salesOrderItems.updateMany({
			where: omittedItemFilter,
			data: { deletedAt: retiredAt },
		});
	}

	return true;
}
