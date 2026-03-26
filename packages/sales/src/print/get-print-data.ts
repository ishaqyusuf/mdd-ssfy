import type { Db } from "@gnd/db";
import type { PrintPage, PrintMode, PrintSection } from "./types";
import { PrintSalesInclude, type PrintSalesData } from "./query";
import { getModeConfig } from "./constants";
import { composeMeta } from "./compose/meta";
import { composeAddresses } from "./compose/addresses";
import { composeDoorSections } from "./compose/door-sections";
import { composeMouldingSections } from "./compose/moulding-sections";
import { composeServiceSections } from "./compose/service-sections";
import { composeShelfSections } from "./compose/shelf-sections";
import { composeLineItemSections } from "./compose/line-item-sections";
import { composeFooter } from "./compose/footer";
import { getSalesSetting } from "../exports";
import type { PrintSalesV2Input } from "./schema";

/**
 * Main entry point: DB → typed PrintPage[] payloads.
 * Templates never touch the database — they receive these payloads only.
 */
export async function getPrintData(
  db: Db,
  input: PrintSalesV2Input,
): Promise<{ pages: PrintPage[]; title: string }> {
  const sales = await db.salesOrders.findMany({
    where: { id: { in: input.ids } },
    include: PrintSalesInclude,
  });

  const setting = await getSalesSetting(db);

  // order-packing generates both invoice + packing-slip per sale
  const jobs: { sale: PrintSalesData; mode: PrintMode }[] = sales.flatMap(
    (s) => {
      if (input.mode === "order-packing") {
        return [
          { sale: s, mode: "invoice" as PrintMode },
          { sale: s, mode: "packing-slip" as PrintMode },
        ];
      }
      return [{ sale: s, mode: input.mode }];
    },
  );

  const pages = jobs.map(({ sale, mode }) =>
    composePage(sale, mode, setting, input.dispatchId),
  );

  const first = pages[0];
  const title =
    pages.length === 1 && first
      ? `${first.meta.title} ${first.meta.salesNo}`
      : `Sales Print (${pages.length})`;

  return { pages, title };
}

function composePage(
  sale: PrintSalesData,
  mode: PrintMode,
  setting: any,
  dispatchId?: number | null,
): PrintPage {
  const config = getModeConfig(mode);
  const meta = composeMeta(sale, mode);
  const { billing, shipping } = composeAddresses(sale, mode);

  // Compose all section types
  const doors = composeDoorSections(sale, config, setting, dispatchId);
  const mouldings = composeMouldingSections(sale, config, dispatchId);
  const services = composeServiceSections(sale, config, dispatchId);
  const shelves = composeShelfSections(sale, config);
  const lineItems = composeLineItemSections(sale, config, dispatchId);

  // Merge and sort all sections by their lineIndex
  const sections: PrintSection[] = [
    ...doors,
    ...mouldings,
    ...services,
    ...shelves,
    ...lineItems,
  ].sort((a, b) => a.index - b.index);

  const footer = config.showFooter ? composeFooter(sale, mode) : null;

  return {
    meta,
    billing,
    shipping,
    sections,
    footer,
    config,
  };
}
