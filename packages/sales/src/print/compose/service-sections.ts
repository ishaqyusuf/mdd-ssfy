import type {
  ServiceSection,
  CellHeader,
  ServiceRow,
  RowCell,
  PrintModeConfig,
} from "../types";
import type { PrintSalesData } from "../query";
import { formatCurrency } from "@gnd/utils";
import { isComponentType } from "../../utils/utils";
import type { SalesItemMeta } from "../../types";
import { packingInfo } from "./packing";

export function composeServiceSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
  dispatchId?: number | null,
): ServiceSection[] {
  const sections: ServiceSection[] = [];
  const seen = new Set<number>();

  for (const item of sale.items) {
    if (!item.housePackageTool) continue;
    if (seen.has(item.id)) continue;

    const itemMeta = item.meta as any as SalesItemMeta;
    const doorType = itemMeta?.doorType;
    if (!doorType) continue;

    const is = isComponentType(doorType);
    if (!is.service) continue;

    const multis = item.multiDyke
      ? sale.items.filter(
          (i) => i.multiDykeUid === item.multiDykeUid && !seen.has(i.id),
        )
      : [item];
    for (const m of multis) seen.add(m.id);

    const headers: CellHeader[] = [
      { title: "#", key: null, colSpan: 1, align: "center" },
      { title: "Description", key: "description", colSpan: 4, align: "left" },
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

    const rows: ServiceRow[] = [];
    let rowNum = 0;
    for (const m of multis) {
      rowNum++;
      const cells: RowCell[] = [
        { value: rowNum, colSpan: 1, align: "center" },
        { value: m.description, colSpan: 4, align: "left" },
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
        kind: "service",
        index: itemMeta?.lineIndex ?? 0,
        title: item.dykeDescription || "Services",
        headers,
        rows,
      });
    }
  }

  return sections;
}
