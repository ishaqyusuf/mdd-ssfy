import { redirect } from "next/navigation";
import {
    salesOverviewStore,
    salesTabs,
} from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/store";
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
        open(salesOverviewId: number, mode: Modes) {
            let salesType: SalesType = mode == "quote" ? "quote" : "order";
            salesOverviewStore.getState().reset({
                salesId: salesOverviewId,
                tabs: tabs(),
                showTabs: mode != "sales-production",
                showFooter: mode == "quote" || mode == "sales",
                adminMode: mode != "production-tasks",
                currentTab: currentTab(),
            });
            setParams({
                // "sales-overview-id": salesOverviewId,
                "sales-type": salesType,
                mode,
            });
            function currentTab() {
                switch (mode) {
                    case "sales-production":
                    case "production-tasks":
                        return "items";
                    case "dispatch-modal":
                        return "shipping_overview";
                    default:
                        return "sales_info";
                }
            }
            function tabs() {
                switch (mode) {
                    case "production-tasks":
                        return salesTabs.productionTasks;
                    case "quote":
                        return salesTabs.quotes;
                    default:
                        return salesTabs.admin;
                }
            }
        },
    };
}
