import { DykeSteps, SalesStat } from "@/db";
import { Colors } from "@/lib/status-badge";
import { sum } from "@/lib/utils";
import dayjs from "dayjs";

import { DykeDoorType, QtyControlType, SalesStatStatus } from "../../types";

export function inToFt(_in) {
    if (_in.includes("-")) return _in;
    let _ft = _in;
    const duo = _ft.split("x");
    if (duo.length == 2) {
        // console.log(_ft);

        return `${inToFt(duo[0]?.trim())} x ${inToFt(duo[1]?.trim())}`;
    }
    try {
        _ft = +_in.split('"')?.[0]?.split("'")[0]?.split("in")?.[0];
        if (_ft > 0) {
            _ft = +_ft;
            const ft = Math.floor(_ft / 12);
            const rem = _ft % 12;
            return `${ft}-${rem}`;
        }
    } catch (e) {}
    return _in;
}
export function ftToIn(h) {
    const [ft, _in] = h
        ?.split(" ")?.[0]
        ?.split("-")
        ?.map((s) => s?.trim())
        .filter(Boolean);
    return `${+_in + +ft * 12}in`;
}
export function createSaleStat(type: QtyControlType, score, total, salesId) {
    const percentage = (score / total) * 100 || 0;
    return {
        type,
        score,
        total,
        salesId,
        percentage,
    };
}
export function statStatus(stat: SalesStat): {
    color: Colors;
    status: SalesStatStatus;
    scoreStatus: string;
} {
    const { percentage, score, total } = stat || {};
    let scoreStatus = "";
    if (score > 0 && score != total) scoreStatus = `${score}/${total}`;

    if (percentage === 0 && total > 0)
        return {
            color: "warmGray",
            status: "pending",
            scoreStatus,
        };
    if (percentage == 0)
        return {
            color: "amber",
            status: "N/A" as any,
            scoreStatus,
        };
    if (percentage > 0 && percentage < 100)
        return {
            color: "rose",
            status: "in progress",
            scoreStatus,
        };
    if (percentage === 100)
        return {
            status: "completed",
            color: "green",
            scoreStatus,
        };
    return {
        color: "stone",
        status: "unknown",
        scoreStatus,
    };
}

export function itemLineIndex(line) {
    return Number(line?.meta?.line_index || line?.meta?.uid || 0);
}
export function sortSalesItems(a, b) {
    return itemLineIndex(a) - itemLineIndex(b);
}

export function isNewSales(orderId) {
    return ["quo-", "ord-"].some((a) => orderId?.toLowerCase()?.startsWith(a));
}
export const composeSalesUrl = (props) =>
    props.isDyke || props.dyke
        ? `/sales-book/edit-${props.type}/${props.orderId || props.slug}`
        : `/sales/edit/${props.type}/${props.orderId || props.slug}`;

export const qtyControlDifference = <T>(from: T, sub): T => {
    let result: any = {};
    Object.entries(from).map(([k, v]) => {
        result[k] = sum([v, sub[k]]);
    });
    // result.total =
    return result as any;
};

export function calculatePaymentDueDate(paymentTerm, createdAt) {
    if (!paymentTerm || paymentTerm == "None") return null;
    const val = +paymentTerm?.toLowerCase()?.replace("net", "")?.trim();
    return dayjs(createdAt).add(val, "days").toISOString();
}
