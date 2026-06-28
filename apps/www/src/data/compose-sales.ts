import type {
    QtyControlType,
    TypedSalesStat,
} from "@/app-deps/(clean-code)/(sales)/types";
import type { SalesStat } from "@/db";

export function composeSalesStatKeyValue(stats: SalesStat[]) {
    const resp = {} as { [id in QtyControlType]: TypedSalesStat };

    for (const stat of stats) {
        resp[stat.type] = stat;
    }

    return resp;
}
