import {
    AddressBookMeta,
    CustomerMeta,
    DykeSalesDoorMeta,
    QtyControlType,
    SalesDispatchStatus,
    SalesSettingsMeta,
    SalesStatStatus,
} from "@/app/(clean-code)/(sales)/types";
import { Prisma } from "@/db";
import dayjs from "dayjs";

import { Qty } from "./sales-control-util";

export const salesFormUrl = (type, slug?, isDyke = true) => {
    if (isDyke)
        return `/sales-book/${slug ? `edit-${type}` : `create-${type}`}${
            slug ? `/${slug}` : ""
        }`;
    return `/sales/edit/${slug}/${slug || "new"}`;
};

// const date = dayjs().
export function composeSalesStat(stats: Prisma.SalesStatGetPayload<{}>[]) {
    const statDateCheck = stats.map((stat) => {
        const isValid = dayjs(stat.createdAt).isAfter(
            dayjs("2025-04-15"),
            "days",
        );
        return {
            isValid,
        };
    });
    let validStat = statDateCheck.every((a) => a.isValid);
    const _stat: { [id in QtyControlType]: (typeof stats)[number] } = {} as any;
    stats.map((s) => (_stat[s.type] = s));
    return {
        isValid: validStat,
        ..._stat,
    };
}
export function qtyControlsByType(controls: Prisma.QtyControlGetPayload<{}>[]) {
    const _stat: { [id in QtyControlType]: (typeof controls)[number] } =
        {} as any;
    controls.map((c) => (_stat[c.type] = c));
    return _stat;
}
export function formatControlQty(
    control: Prisma.QtyControlGetPayload<{}>,
): Qty {
    return {
        lh: control?.lh,
        rh: control?.rh,
        qty: control?.total,
        noHandle: !control?.lh && !control?.rh,
    };
}
export function productionStatus(qty, completed): SalesStatStatus {
    if (!qty) return "unknown";
    if (completed == 0) return "pending";
    if (qty == completed) return "completed";
    if (qty > completed && completed > 0) return "in progress";
}

export function salesAddressLines(
    address: Prisma.AddressBooksGetPayload<{}>,
    customer?: Prisma.CustomersGetPayload<{}>,
) {
    let meta = address?.meta as any as AddressBookMeta;
    let cMeta = customer?.meta as any as CustomerMeta;
    return [
        address?.name || customer?.name || customer?.businessName,
        address?.phoneNo || customer?.phoneNo || customer?.phoneNo2,
        address?.email || customer?.email,
        address?.address1 || customer?.address,
        address?.address2,
        [address?.city, address?.state, meta?.zip_code, address?.country]
            ?.filter(Boolean)
            ?.join(", "),
    ].filter(Boolean);
}
interface ItemStatConfigProps {
    isDyke?: boolean;
    qty?;
    formSteps;
    setting: SalesSettingsMeta;
    dykeProduction?: boolean;
    swing?;
    prodOverride?: DykeSalesDoorMeta["prodOverride"];
}
export function getItemStatConfig({ setting, ...props }: ItemStatConfigProps) {
    const mainStep = props.formSteps?.[0];
    const stepConfigUid = mainStep?.prodUid;
    let config = setting?.route?.[stepConfigUid]?.config;

    const isService = mainStep?.value?.toLowerCase() == "services";

    return props.isDyke
        ? {
              production: isService
                  ? props.dykeProduction
                  : props?.prodOverride
                    ? props?.prodOverride?.production
                    : config?.production,
              shipping: config?.shipping,
          }
        : {
              production: !!(props.qty && props.swing),
              shipping: !!props.qty,
          };
}
export function squareSalesNote(orderIds: string[]) {
    return `sales payment for order${
        orderIds.length > 1 ? "s" : ""
    } ${orderIds.join(", ")}`;
}

export function getDispatchControlType(
    status: SalesDispatchStatus,
): QtyControlType {
    switch (status) {
        case "cancelled":
            return "dispatchCancelled";
        case "completed":
            return "dispatchCompleted";
        case "in progress":
            return "dispatchInProgress";
        default:
            return "dispatchAssigned";
    }
}

export function payrollUid(oid, pid, submissionId) {
    return Object.entries({ oid, pid, submissionId })
        .filter(([a, b]) => !!b)
        .map(([a, b]) => `${a}:${b}`)
        .join(",");
}
export function payrollUidSearch(value, k: "oid" | "pid" | "submissionId") {
    return `${k}:${value}`;
}
export function transformPayrollUid(uid) {
    return Object.fromEntries(
        uid?.split(",").map((a) => {
            const [k, v] = a?.split(":");
            return [k, Number(v)];
        }),
    ) as any as {
        oid: number;
        pid: number;
        submissionId: number;
    };
}
export function laborRate(rate, override) {
    return override ?? (override === 0 ? 0 : rate);
}
