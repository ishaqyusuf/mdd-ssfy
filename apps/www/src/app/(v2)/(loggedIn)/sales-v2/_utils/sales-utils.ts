import { DykeSalesDoors, SalesOrderItems } from "@/db";
import { sum } from "@/lib/utils";
import { ISalesOrderItemMeta } from "@/types/sales";

export function getSalesQties(order) {
    const isDyke = order.isDyke;

    let _items: (SalesOrderItems & { meta: ISalesOrderItemMeta })[] =
        order.items;
    let _doors: DykeSalesDoors[] = order.doors;

    const totalProduceable = sum(
        isDyke
            ? [
                  ..._doors?.map((d) => sum([d.lhQty, d.rhQty])),
                  ..._items
                      ?.filter((s) => s.dykeProduction && s.qty)
                      ?.map((s) => s.qty),
              ]
            : _items?.filter((i) => i.swing)?.map((i) => i.qty),
    );
    const totalShelfs = sum(
        isDyke
            ? _items
                  .filter(
                      (item) => item.meta.doorType == "Shelf Items" && item.qty,
                  )
                  ?.map((item) => item.qty)
            : [],
    );
    return {
        shelfQty: totalShelfs,
        prodQty: totalProduceable,
        deliverableQty: totalShelfs + totalProduceable,
    };
}
export function getTotalDeliverables(order) {}
