import {
    salesOverviewStore,
    salesTabs,
} from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet/store";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import {
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

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
        "prod-item-tab": parseAsString,
        onCloseQuery: parseAsJson(),
        salesTab: parseAsStringEnum([
            "general",
            "production",
            "transaction",
            "shipping",
            "notification",
        ] as const),
        refreshTok: parseAsString,
    });

    return {
        ...params,
        params,
        close() {
            setParams(null);
            onCloseQuery.handle(params, setParams);
        },
        setParams,
        open2(orderNo: string, mode: Modes) {
            let salesType: SalesType = mode == "quote" ? "quote" : "order";
            setParams({
                "sales-overview-id": orderNo,
                "sales-type": salesType,
                mode,
                salesTab: "general",
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
