import { toast } from "sonner";
import { Data, salesOverviewStore, SalesTabs } from "./store";
import { loadSalesOverviewAction } from "../../data-actions/sales-overview.action";
import { validateSalesStatControlAction } from "../../data-actions/sales-stat-control.action";
import { getSalesItemsOverviewAction } from "../../data-actions/sales-items-action";
import { salesDispatchListOverview } from "../../data-actions/dispatch-actions/dispatch-overview-action";
import { getDispatchUsersListAction } from "@/data-actions/users/get-users";

interface LoadPageDataProps {
    dataKey: keyof Data;
    // loadFn;
    reload?: boolean;
}

export const loaders: Partial<{ [k in keyof Data]: any }> = {
    overview: async () => {
        await validateSalesStatControlAction(
            salesOverviewStore.getState().salesId
        );
        return loadSalesOverviewAction(salesOverviewStore.getState().salesId);
    },
    itemOverview: async () => {
        return getSalesItemsOverviewAction({
            salesId: salesOverviewStore.getState().salesId,
            adminMode: salesOverviewStore.getState().adminMode,
        });
    },
    shipping: async () => {
        return salesDispatchListOverview(salesOverviewStore.getState().salesId);
    },
    dispatchUsers: async () => {
        return getDispatchUsersListAction();
    },
};
export const tabLoaders: Partial<{ [k in SalesTabs]: (keyof Data)[] }> = {
    sales_info: ["overview"],
    items: ["overview", "itemOverview"],
    productions: ["overview", "itemOverview"],
    shipping: ["overview", "shipping"],
    shipping_form: ["overview", "dispatchUsers", "shipping", "itemOverview"],
};
export const getOpenItem = () => {
    const state = salesOverviewStore.getState();
    return state?.itemOverview?.items?.find(
        (item) => item.itemControlUid == state?.itemViewId
    );
};
export const getPendingAssignments = () => {
    const item = getOpenItem();
    const status = item.status;
    const qty = status.qty;
    const assigned = status.prodAssigned;
    const data = {
        lh: qty.lh - assigned.lh,
        rh: qty.rh - assigned.rh,
        qty: qty.qty - assigned.qty,
    };
    let forms = [];
    Object.entries(data).map(([k, v]) => {
        if (!v) data[k] = null;
        else {
            data[k] = String(v);
            forms.push({
                label: k,
                options: Array(v)
                    .fill(null)
                    .map((a, i) => (i + 1)?.toString()),
            });
        }
    });
    return { forms, data };
};
export async function refreshTabData(tab: SalesTabs) {
    await Promise.all(
        tabLoaders?.[tab]?.map(
            async (dataKey) => await loadPageData({ dataKey, reload: true })
        )
    );
}

export async function loadPageData({ dataKey, reload }: LoadPageDataProps) {
    const loadFn = loaders[dataKey];
    const store = salesOverviewStore.getState();
    if (store.tabPageLoading && store.tabPageLoadingTitle == dataKey) return;
    if (store[dataKey as any] && !reload) {
        return;
    }

    store.update("tabLoadFailed", false);
    await loadFn()
        .then((result) => {
            store.update(dataKey as any, result);
            store.update("tabLoadFailed", false);
            store.update("tabPageLoading", false);
            store.update("tabPageLoadingTitle", null);
        })
        .catch((e) => {
            if (e instanceof Error) {
                toast.error(e.message);
            } else toast.error("Tab Load Failed");
            store.update("tabLoadFailed", true);
            store.update("tabPageLoading", false);
            store.update("tabPageLoadingTitle", null);
        });
}
export function AdminOnly({ children }) {
    const store = salesOverviewStore();
    if (store.adminMode) return children;
    return null;
}
export function GuestOnly({ children }) {
    const store = salesOverviewStore();
    if (!store.adminMode) return children;
    return null;
}
export const helpers = {
    submitAllPendingAssignment: async (itemUid) => {},
    markAllPendingAsCompleted: async (itemUid) => {},
    markItemAsProductionCompleted: async (itemUid) => {},
    markSalesAsProductionCompleted: async () => {},
    submitAllOrderPendingAssignments: async () => {},
    markAllPendingProductionAsCompleted: async () => {},
};
