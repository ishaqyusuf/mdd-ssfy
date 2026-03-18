import type {
  MouldingSection,
  CellHeader,
  MouldingRow,
  RowCell,
  PrintModeConfig,
} from "../types";
import type { PrintSalesData } from "../query";
import { formatCurrency } from "@gnd/utils";
import { isComponentType } from "../../utils/utils";
import type { SalesItemMeta } from "../../types";
import { packingInfo } from "./packing";

export function composeMouldingSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
  dispatchId?: number | null,
): MouldingSection[] {
  const sections: MouldingSection[] = [];
  const seen = new Set<number>();

  for (const item of sale.items) {
    if (!item.housePackageTool) continue;
    if (seen.has(item.id)) continue;

    const itemMeta = item.meta as any as SalesItemMeta;
    const doorType = itemMeta?.doorType;
    if (!doorType) continue;

    const is = isComponentType(doorType);
    if (!is.moulding) continue;

    // Multi-dyke grouping
    const multis = item.multiDyke
      ? sale.items.filter(
          (i) => i.multiDykeUid === item.multiDykeUid && !seen.has(i.id),
        )
      : [item];
    for (const m of multis) seen.add(m.id);

    const headers: CellHeader[] = [
      { title: "#", key: null, colSpan: 1, align: "center" },
      { title: "Items", key: "moulding", colSpan: 4, align: "left" },
      { title: "Qty", key: "qty", colSpan: 1.2, align: "center" },
    ];
    if (config.showPrices) {
      headers.push(
        { title: "Rate", key: "unitPrice", colSpan: 2.5, align: "right" },
        { title: "Total", key: "lineTotal", colSpan: 2.5, align: "right" },
      );
    }
    if (config.showPackingCol) {
      headers.push({
        title: "Ship. Qty",
        key: "packing",
        colSpan: 3,
        align: "center",
      });
    }

    const rows: MouldingRow[] = [];
    let rowNum = 0;
    for (const m of multis) {
      if (!m.total) continue;
      rowNum++;

      const mouldingTitle =
        m.housePackageTool?.molding?.title ||
        m.housePackageTool?.stepProduct?.name ||
        m.housePackageTool?.stepProduct?.product?.title ||
        m.description ||
        "";

      const mouldingImage =
        m.housePackageTool?.molding?.img ||
        m.housePackageTool?.stepProduct?.img ||
        m.housePackageTool?.stepProduct?.product?.img ||
        null;

      const cells: RowCell[] = [
        { value: rowNum, colSpan: 1, align: "center" },
        {
          value: mouldingTitle,
          colSpan: 4,
          align: "left",
          image: mouldingImage,
        },
        { value: m.qty, colSpan: 1.2, align: "center" },
      ];

      if (config.showPrices) {
        cells.push(
          {
            value: `$${formatCurrency(m.rate!)}`,
            colSpan: 2.5,
            align: "right",
          },
          {
            value: `$${formatCurrency(m.total)}`,
            colSpan: 2.5,
            align: "right",
            bold: true,
          },
        );
      }

      if (config.showPackingCol) {
        cells.push({
          value: packingInfo(sale, m.id, undefined, dispatchId),
          colSpan: 3,
          align: "center",
          bold: true,
        });
      }

      rows.push({ cells });
    }

    if (rows.length > 0) {
      sections.push({
        kind: "moulding",
        index: itemMeta?.lineIndex ?? 0,
        title: item.dykeDescription || doorType,
        headers,
        rows,
      });
    }
  }

  return sections;
}
