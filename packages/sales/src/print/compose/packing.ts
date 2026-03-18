import type { PrintSalesData } from "../query";
import { sum } from "@gnd/utils";

/**
 * Resolve packing/shipping quantity info for a specific item+door in a dispatch.
 * Returns null if no dispatch context, "N/A" if no matching delivery items,
 * or a formatted string like "2 LH & 1 RH".
 */
export function packingInfo(
  sale: PrintSalesData,
  itemId: number,
  doorId?: number,
  dispatchId?: number | null,
): string | null {
  if (!dispatchId) return null;

  const deliveries = sale.deliveries ?? [];

  // -1 means "all deliveries"
  const items =
    dispatchId === -1
      ? deliveries.flatMap((d) => d.items)
      : deliveries.find((d) => d.id === dispatchId)?.items;

  if (!items) return "N/A";

  const filtered = items.filter((item) => {
    const checks = [item.orderItemId === itemId];
    if (doorId)
      checks.push(item.submission?.assignment?.salesDoorId === doorId);
    if (dispatchId !== -1)
      checks.push(item.orderDeliveryId === dispatchId);
    return checks.every(Boolean);
  });

  if (!filtered.length) return "N/A";

  const sumLh = sum(filtered, "lhQty");
  const sumRh = sum(filtered, "rhQty");
  const sumQty = sum(filtered, "qty");

  const texts: string[] = [];
  if (sumLh) texts.push(`${sumLh} LH`);
  if (sumRh) texts.push(`${sumRh} RH`);
  if (!sumLh && !sumRh && sumQty) texts.push(`${sumQty}`);

  return texts.join(" & ");
}
