import { redirect } from "next/navigation";

import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { generateRandomString } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";
import { z } from "zod";

const openModes = [
    "quote",
    "sales",
    "sales-production",
    "dispatch-modal",
    "production-tasks",
] as const;
type Modes = (typeof openModes)[number];
export function useSalesOverviewQuery() {
    const onCloseQuery = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        "sales-overview-id": parseAsString,
        "sales-type": parseAsStringEnum(["quote", "sales"] as SalesType[]),
        mode: parseAsStringEnum([...openModes]),
        "prod-item-view": parseAsString,
        "prod-item-tab": parseAsStringEnum(["assignments", "details", "notes"]),
        onCloseQuery: parseAsJson(z.any().parse),
        dispatchId: parseAsInteger,
        salesTab: parseAsStringEnum([
            "general",
            "production",
            "transaction",
            "dispatch",
            "notification",
        ] as const),
        refreshTok: parseAsString,
        dispatchOverviewId: parseAsInteger,
    });
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const assignedTo =
        session?.data?.can?.viewProduction && !session?.data?.can?.viewOrders
            ? session?.data?.user.id
            : null;
    return {
        ...params,
        dispatchMode: !!params.dispatchId,
        params,
        assignedTo,
        close() {
            setParams(null);
            onCloseQuery.handle(params, setParams);
        },
        _refreshToken() {
            setParams({
                refreshTok: generateRandomString(),
            });
        },
        setParams,
        openDispatch(orderNo: string, dispatchId) {
            setParams({
                "sales-overview-id": orderNo,
                "sales-type": "order",
                mode: "dispatch-modal",
                salesTab: "production",
                dispatchId,
            });
        },
        open2(orderNo: string, mode: Modes) {
            let salesType: SalesType = mode == "quote" ? "quote" : "order";
            if (assignedTo) mode = "production-tasks";
            setParams({
                "sales-overview-id": orderNo,
                "sales-type": salesType,
                mode,
                salesTab: assignedTo ? "production" : "general",
            });
        },
    };
}
