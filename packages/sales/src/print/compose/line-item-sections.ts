import type {
  LineItemSection,
  LineItemRow,
  CellHeader,
  RowCell,
  PrintModeConfig,
} from "../types";
import type { PrintSalesData, PrintSalesItem } from "../query";
import { formatCurrency } from "@gnd/utils";
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

function getSectionIndex(items: PrintSalesItem[]): number {
  return Math.min(
    ...items
      .map((item, index) => getOrderIndex(item, index))
      .filter(Number.isFinite),
  );
}

export function composeLineItemSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
  dispatchId?: number | null,
): LineItemSection[] {
  const items = sale.items
    .filter((item) => !item.housePackageTool)
    .filter((item) => !item.shelfItems?.length)
    .sort(
      (a, b) =>
        getOrderIndex(a, Number.MAX_SAFE_INTEGER) -
        getOrderIndex(b, Number.MAX_SAFE_INTEGER),
    );

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

  const rows: LineItemRow[] = items.map((item) => {
    const isGroupHeader = !item.rate && !item.total;
    const cells: RowCell[] = [
      {
        value: item.rate ? ++sequenceNumber : "",
        colSpan: 1,
        align: "center",
        bold: true,
      },
      {
        value: item.description ?? "",
        colSpan: 5,
        align: isGroupHeader ? "center" : "left",
        // bold: true,
      },
      {
        value: item.swing ?? "",
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
      index: getSectionIndex(items),
      title: "Invoice Lines",
      headers,
      rows,
    },
  ];
}
