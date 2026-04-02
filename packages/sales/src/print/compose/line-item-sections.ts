import { formatCurrency } from "@gnd/utils";
import type { PrintSalesData, PrintSalesItem } from "../query";
import type {
	CellHeader,
	LineItemRow,
	LineItemSection,
	PrintModeConfig,
	RowCell,
} from "../types";
import { packingInfo } from "./packing";

function getMetaNumber(
	item: PrintSalesItem,
	key: "lineIndex" | "line_index" | "uid",
): number | null {
	const meta = (item.meta ?? {}) as Record<string, unknown>;
	const raw = meta[key];
	if (typeof raw === "number" && Number.isFinite(raw)) return raw;
	if (typeof raw === "string" && raw.trim() !== "") {
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function getOrderIndex(item: PrintSalesItem, fallback: number): number {
	return (
		getMetaNumber(item, "uid") ??
		getMetaNumber(item, "lineIndex") ??
		getMetaNumber(item, "line_index") ??
		fallback
	);
}

function getLegacyUid(item: PrintSalesItem, fallback: number): number {
	const uid = getMetaNumber(item, "uid");
	if (uid != null) return uid;

	const lineIndex =
		getMetaNumber(item, "line_index") ?? getMetaNumber(item, "lineIndex");
	if (lineIndex != null && lineIndex >= 0) return lineIndex;

	return fallback;
}

function getSectionIndex(items: PrintSalesItem[]): number {
	return Math.min(
		...items
			.map((item, index) => getOrderIndex(item, index))
			.filter(Number.isFinite),
	);
}

function formatLineItemDescription(value: string | null | undefined) {
	return String(value || "").toUpperCase();
}

function formatLineItemSwing(value: string | null | undefined) {
	return String(value || "").toUpperCase();
}

export function composeLineItemSections(
	sale: PrintSalesData,
	config: PrintModeConfig,
	dispatchId?: number | null,
): LineItemSection[] {
	const items = sale.items
		.filter((item) => !item.housePackageTool)
		.filter((item) => !item.shelfItems?.length)
		.map((item, index) => ({
			item,
			orderIndex: getOrderIndex(item, index),
			uid: getLegacyUid(item, index),
			fallbackIndex: index,
		}))
		.sort((a, b) => {
			if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
			if (a.uid !== b.uid) return a.uid - b.uid;
			return a.fallbackIndex - b.fallbackIndex;
		});

	if (!items.length) return [];

	const headers: CellHeader[] = [
		{ title: "#", key: null, colSpan: 1, align: "center" },
		{ title: "Description", key: "description", colSpan: 5, align: "left" },
		{ title: "Swing", key: "swing", colSpan: 2, align: "center" },
		{ title: "Qty", key: "qty", colSpan: 1.2, align: "center" },
	];

	if (config.showPackingCol) {
		headers.push({
			title: "Packed Qty",
			key: "packing",
			colSpan: 2,
			align: "center",
		});
	}

	if (config.showPrices) {
		headers.push(
			{ title: "Rate", key: "rate", colSpan: 2.5, align: "right" },
			{ title: "Total", key: "total", colSpan: 2.5, align: "right" },
		);
	}

	let sequenceNumber = 0;
	const rows: LineItemRow[] = items.map(({ item }) => {
		const isGroupHeader = !item.rate;
		const cells: RowCell[] = [
			{
				value: item.rate ? ++sequenceNumber : "",
				colSpan: 1,
				align: "center",
				bold: true,
			},
			{
				value: formatLineItemDescription(item.description),
				colSpan: 5,
				align: isGroupHeader ? "center" : "left",
				bold: true,
			},
			{
				value: formatLineItemSwing(item.swing),
				colSpan: 2,
				align: "center",
				bold: true,
			},
			{
				value: item.qty ?? "",
				colSpan: 1.2,
				align: "center",
				bold: true,
			},
		];

		if (config.showPackingCol) {
			cells.push({
				value: packingInfo(sale, item.id, undefined, dispatchId),
				colSpan: 2,
				align: "center",
				bold: true,
			});
		}

		if (config.showPrices) {
			cells.push(
				{
					value: item.total ? `$${formatCurrency(item.rate || 0)}` : null,
					colSpan: 2.5,
					align: "right",
				},
				{
					value: item.total ? `$${formatCurrency(item.total || 0)}` : null,
					colSpan: 2.5,
					align: "right",
					bold: true,
				},
			);
		}

		return {
			cells,
			isGroupHeader,
		};
	});

	return [
		{
			kind: "line-item",
			index: getSectionIndex(items.map(({ item }) => item)),
			title: "",
			headers,
			rows,
		},
	];
}
