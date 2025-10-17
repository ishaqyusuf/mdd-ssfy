import { percent, sum } from "@/lib/utils";
import { DeliveryBreakdown } from "../data-access/dto/sales-item-dto";
import { padStart } from "lodash";

export function calculateDeliveryBreakdownPercentage(
    bd: DeliveryBreakdown,
    totalDeliverables
) {
    bd.percentage = {};
    bd.pending = { qty: 0 };
    bd.totalDeliverable = 0;
    if (totalDeliverables) {
        let totalDeliveries = sum(Object.values(bd.status).map((s) => s.qty));
        bd.totalDeliverable = totalDeliverables;
        bd.totalDeliveries = totalDeliveries;
        bd.pending.qty = totalDeliverables - totalDeliveries;
        bd.percentage = {
            delivered: percent(bd.status.delivered.qty, totalDeliverables),
            inProgress: percent(bd.status.inProgress.qty, totalDeliverables),
            queue: percent(bd.status.queue.qty, totalDeliverables),
            pending: percent(bd.pending.qty, totalDeliverables),
        };
    }
    return bd;
}
export function overallDeliveryBreakdown(dbs: DeliveryBreakdown[]) {
    let bd: DeliveryBreakdown = {};
    const dbsFiltered = dbs.filter((d) => d.totalDeliverable > 0);
    if (dbsFiltered.length) {
        bd = {
            totalDeliverable: sum(dbsFiltered.map((d) => d.totalDeliverable)),
            totalDeliveries: sum(dbsFiltered.map((d) => d.totalDeliveries)),
            pending: {
                qty: sum(dbsFiltered.map((d) => d.pending.qty)),
            },
            status: {
                delivered: {
                    qty: sum(dbsFiltered.map((d) => d.status.delivered.qty)),
                },
                inProgress: {
                    qty: sum(dbsFiltered.map((d) => d.status.inProgress.qty)),
                },
                queue: {
                    qty: sum(dbsFiltered.map((d) => d.status.queue.qty)),
                },
            },
        };
        let totalDeliverables = bd.totalDeliverable;
        bd.percentage = {
            delivered: percent(bd.status.delivered.qty, totalDeliverables),
            inProgress: percent(bd.status.inProgress.qty, totalDeliverables),
            queue: percent(bd.status.queue.qty, totalDeliverables),
            pending: percent(bd.pending.qty, totalDeliverables),
        };
    }
    return bd;
}

export function generateDispatchId(id) {
    return `#DISP-${padStart(id, 4, "0")}`;
}
