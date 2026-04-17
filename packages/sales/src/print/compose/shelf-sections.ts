import type {
  ShelfSection,
  CellHeader,
  ShelfRow,
  RowCell,
  PrintModeConfig,
} from "../types";
import type { PrintSalesData } from "../query";
import { formatCurrency } from "@gnd/utils";
import { getSectionIndex } from "./grouped-item-helpers";

export function composeShelfSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
): ShelfSection[] {
  const sections: ShelfSection[] = [];

  for (const [itemIndex, item] of sale.items.entries()) {
    if (!item.shelfItems?.length) continue;

    const headers: CellHeader[] = [
      { title: "#", key: null, colSpan: 1, align: "center" },
      { title: "Item", key: "description", colSpan: 4, align: "left" },
      { title: "Qty", key: "qty", colSpan: 1.2, align: "center" },
    ];
    if (config.showPrices) {
      headers.push(
        { title: "Rate", key: "unitPrice", colSpan: 2.5, align: "right" },
        { title: "Total", key: "totalPrice", colSpan: 2.5, align: "right" },
      );
    }

    const rows: ShelfRow[] = item.shelfItems.map((sItem, i) => {
      const shelfImage = sItem.shelfProduct?.img || null;

      const cells: RowCell[] = [
        { value: i + 1, colSpan: 1, align: "center" },
        {
          value: sItem.description || sItem.shelfProduct?.title || "",
          colSpan: 4,
          align: "left",
          image: shelfImage,
        },
        { value: sItem.qty, colSpan: 1.2, align: "center" },
      ];

      if (config.showPrices) {
        cells.push(
          {
            value: `$${formatCurrency(sItem.unitPrice)}`,
            colSpan: 2.5,
            align: "right",
          },
          {
            value: `$${formatCurrency(sItem.totalPrice)}`,
            colSpan: 2.5,
            align: "right",
            bold: true,
          },
        );
      }

      return { cells };
    });

    sections.push({
      kind: "shelf",
      index: getSectionIndex(item, itemIndex),
      title: item.dykeDescription || "Shelf Items",
      headers,
      rows,
    });
  }

  return sections;
}
