import { SalesMeta } from "../../types";

type SalesBookExtraCostLike = {
    id?: number | null;
    label?: string | null;
    amount?: number | null;
    orderId?: number | null;
    type?: string | null;
    taxxable?: boolean | null;
};

export function normalizeSalesBookFormExtraCosts(order: {
    id?: number | null;
    extraCosts?: SalesBookExtraCostLike[] | null;
    meta?: Partial<SalesMeta> | null;
}) {
    const extraCosts = [...(order.extraCosts || [])];
    const meta = (order.meta || {}) as Partial<SalesMeta>;
    const deliveryCost = Number(meta.deliveryCost || 0);

    if (deliveryCost) {
        const hasMatchingDeliveryCost = extraCosts.some(
            (cost) =>
                cost?.type == "Delivery" &&
                Number(cost?.amount || 0) == deliveryCost,
        );
        if (!hasMatchingDeliveryCost) {
            extraCosts.push({
                label: "Delivery",
                amount: deliveryCost,
                orderId: order.id || undefined,
                type: "Delivery",
            });
        }
        meta.deliveryCost = null;
    }

    return extraCosts;
}
