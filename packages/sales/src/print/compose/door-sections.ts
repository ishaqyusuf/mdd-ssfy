import type {
  DoorSection,
  CellHeader,
  DoorRow,
  RowCell,
  SectionDetail,
  PrintModeConfig,
} from "../types";
import type { PrintSalesData, PrintSalesItem } from "../query";
import { formatCurrency } from "@gnd/utils";
import { isComponentType, ftToIn } from "../../utils/utils";
import type { StepComponentMeta } from "../../types";
import { getSalesSetting, type SalesSetting } from "../../exports";
import { packingInfo } from "./packing";
import {
  getSalesItemType,
  getSectionIndex,
} from "./grouped-item-helpers";

/**
 * Compose door sections from sales items.
 * Groups multi-dyke items and builds typed DoorSection payloads.
 */
export function composeDoorSections(
  sale: PrintSalesData,
  config: PrintModeConfig,
  setting: SalesSetting | null,
  dispatchId?: number | null,
): DoorSection[] {
  const sections: DoorSection[] = [];
  const seen = new Set<number>();

  for (const [itemIndex, item] of sale.items.entries()) {
    if (!item.housePackageTool) continue;
    if (seen.has(item.id)) continue;

    const doorType = getSalesItemType(item);
    if (!doorType) continue;

    const is = isComponentType(doorType);
    if (is.moulding || is.service || is.shelf) continue;

    // Multi-dyke grouping
    const multis = item.multiDyke
      ? sale.items.filter(
          (i) => i.multiDykeUid === item.multiDykeUid && !seen.has(i.id),
        )
      : [item];
    for (const m of multis) seen.add(m.id);

    // Resolve config overrides (noHandle, hasSwing)
    const ovs = item.formSteps
      ?.map(
        (fs) =>
          (fs.component?.meta as any as StepComponentMeta)?.sectionOverride,
      )
      ?.filter(Boolean);
    const sectionOverride = ovs?.find((s) => s!.overrideMode);
    const rootStep = item.formSteps?.find(
      (fs) => fs.step.title === "Item Type",
    );
    const rootConfig = setting?.data?.route?.[rootStep?.prodUid!]?.config;
    const resolvedConfig = sectionOverride || rootConfig || null;

    const noHandle = resolvedConfig
      ? resolvedConfig?.noHandle
      : !is.bifold && !is.service && !is.slab;
    const hasSwing = resolvedConfig ? resolvedConfig.hasSwing : is.garage;

    // Build headers
    const headers: CellHeader[] = [
      { title: "#", key: null, colSpan: 1, align: "center" },
      { title: "Door", key: "door", colSpan: 4, align: "left" },
      { title: "Size", key: "dimension", colSpan: 2.5, align: "left" },
    ];
    if (hasSwing) {
      headers.push({ title: "Swing", key: "swing", colSpan: 2 });
    }
    if (noHandle) {
      headers.push({
        title: "Qty",
        key: "qty",
        colSpan: 1.2,
        align: "center",
      });
    } else {
      headers.push(
        { title: "LH", key: "lhQty", colSpan: 1.2, align: "center" },
        { title: "RH", key: "rhQty", colSpan: 1.2, align: "center" },
      );
    }
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

    // Build configuration details
    const details: SectionDetail[] = is.bifold
      ? []
      : (item.formSteps ?? [])
          .filter(
            (t) =>
              !["Door", "Item Type", "Moulding"].includes(t.step.title ?? ""),
          )
          .map((conf) => ({
            label: conf.step?.title ?? "",
            value: conf.component?.name ?? conf?.value ?? "",
          }));

    // Build rows
    const rows: DoorRow[] = [];
    let rowNum = 0;
    for (const m of multis) {
      if (!m.housePackageTool?.doors?.length) continue;
      for (const door of m.housePackageTool.doors) {
        rowNum++;
        const doorTitle =
          door?.stepProduct?.name ||
          door?.stepProduct?.door?.title ||
          door?.stepProduct?.product?.title ||
          "";
        const isPh = m.formSteps?.find((s) =>
          s.value?.toLowerCase()?.startsWith("ph -"),
        );

        const doorImage =
          door?.stepProduct?.img ||
          door?.stepProduct?.door?.img ||
          door?.stepProduct?.product?.img ||
          m?.housePackageTool?.stepProduct?.img ||
          m?.housePackageTool?.stepProduct?.door?.img ||
          m?.housePackageTool?.stepProduct?.product?.img ||
          m?.housePackageTool?.door?.img ||
          null;

        const dimIn = door?.dimension
          ?.split("x")
          ?.map((a) => ftToIn(a?.trim())?.replaceAll("in", '"'))
          .join(" x ");

        const cells: RowCell[] = [
          { value: rowNum, colSpan: 1, align: "center" },
          {
            value: `${isPh ? "PH - " : ""}${doorTitle}`,
            colSpan: 4,
            align: "left",
            image: doorImage,
          },
          {
            value: config.showPrices ? dimIn : door.dimension,
            colSpan: 2.5,
            align: "left",
          },
        ];

        if (hasSwing) {
          cells.push({ value: door.swing, colSpan: 2 });
        }

        if (noHandle) {
          cells.push({
            value: door.totalQty || door.lhQty || m.qty,
            colSpan: 1.2,
            align: "center",
          });
        } else {
          cells.push(
            { value: door.lhQty, colSpan: 1.2, align: "center" },
            { value: door.rhQty, colSpan: 1.2, align: "center" },
          );
        }

        if (config.showPrices) {
          const total =
            door.lineTotal ||
            (door.unitPrice && door.totalQty
              ? door.unitPrice * door.totalQty
              : 0);
          cells.push(
            {
              value: `$${formatCurrency(door.unitPrice)}`,
              colSpan: 2.5,
              align: "right",
            },
            {
              value: `$${formatCurrency(total)}`,
              colSpan: 2.5,
              align: "right",
              bold: true,
            },
          );
        }

        if (config.showPackingCol) {
          cells.push({
            value: packingInfo(sale, m.id, door.id, dispatchId),
            colSpan: 3,
            align: "center",
            bold: true,
          });
        }

        rows.push({ cells });
      }
    }

    sections.push({
      kind: "door",
      index: getSectionIndex(item, itemIndex),
      title: item.dykeDescription || doorType,
      details,
      headers,
      rows,
    });
  }

  return sections;
}
