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
import { packingInfo } from "./packing";
import {
  findSelectedStepComponent,
  getMetaRows,
  getSalesItemType,
  getSectionIndex,
  isMetadataBackedMouldingItem,
} from "./grouped-item-helpers";

export function composeMouldingSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
  dispatchId?: number | null,
): MouldingSection[] {
  const sections: MouldingSection[] = [];
  const seen = new Set<number>();

  for (const [itemIndex, item] of sale.items.entries()) {
    const isMetadataBacked = isMetadataBackedMouldingItem(item);
    if (!item.housePackageTool && !isMetadataBacked) continue;
    if (seen.has(item.id)) continue;

    const doorType = getSalesItemType(item);
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
      const metadataRows = isMetadataBackedMouldingItem(m)
        ? getMetaRows<{
            uid?: string | null;
            title?: string | null;
            description?: string | null;
            qty?: number | null;
            salesPrice?: number | null;
            lineTotal?: number | null;
            addon?: number | null;
            customPrice?: number | null;
          }>(m, "mouldingRows")
        : [];

      if (metadataRows.length) {
        for (const row of metadataRows) {
          const qty = Number(row?.qty || 0);
          const salesPrice = Number(row?.salesPrice || 0);
          const addon = Number(row?.addon || 0);
          const customPrice =
            row?.customPrice == null ? null : Number(row.customPrice || 0);
          const lineTotal =
            row?.lineTotal == null
              ? Number(
                  (
                    qty *
                    (customPrice == null ? salesPrice + addon : customPrice + addon)
                  ).toFixed(2),
                )
              : Number(row.lineTotal || 0);
          const unitPrice =
            qty > 0 ? Number((lineTotal / qty).toFixed(2)) : 0;
          const component = findSelectedStepComponent(m, "Moulding", row?.uid);
          rowNum++;

          const cells: RowCell[] = [
            { value: rowNum, colSpan: 1, align: "center" },
            {
              value:
                String(component?.title || "").trim() ||
                String(row?.title || "").trim() ||
                String(row?.description || "").trim() ||
                m.description ||
                "",
              colSpan: 4,
              align: "left",
              image: (component?.img as string | null | undefined) || null,
            },
            { value: qty, colSpan: 1.2, align: "center" },
          ];

          if (config.showPrices) {
            cells.push(
              {
                value: `$${formatCurrency(unitPrice)}`,
                colSpan: 2.5,
                align: "right",
              },
              {
                value: `$${formatCurrency(lineTotal)}`,
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
        continue;
      }

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
        index: getSectionIndex(item, itemIndex),
        title: item.dykeDescription || doorType,
        headers,
        rows,
      });
    }
  }

  return sections;
}
