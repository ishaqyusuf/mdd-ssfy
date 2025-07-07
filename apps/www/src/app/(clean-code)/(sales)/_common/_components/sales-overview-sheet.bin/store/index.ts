import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";
import { LoadSalesOverviewAction } from "../../../data-actions/sales-overview.action";
import { GetSalesItemOverviewAction } from "../../../data-actions/sales-items-action";
import { DispatchOverviewAction } from "../../../data-actions/dispatch-actions/dispatch-overview-action";
import { GetUsersList } from "@/data-actions/users/get-users";
import { DeliveryOption } from "@/types/sales";
import { SelectionType } from "../tabs/sales-shipping-form/ctx";

export type SalesTabs =
    | "sales_info"
    | "production"
    | "productions"
    | "items"
    | "payments"
    | "production_note"
    | "shipping"
    | "shipping_overview"
    | "shipping_form"
    | "transactions"
    | "notification";
const data = {
    salesId: null,
    overview: null as LoadSalesOverviewAction,
    itemOverview: null as GetSalesItemOverviewAction,
    itemViewId: null as any,
    itemView: null as GetSalesItemOverviewAction["items"][number],
    payment: null,
    dispatchUsers: null as GetUsersList,
    shipping: null as DispatchOverviewAction,
    shippingForm: {
        dispatchMode: "" as DeliveryOption,
        assignedToId: "",
        selection: {} as SelectionType,
        loaded: false,
        markAll: false,
        totalSelected: 0,
        selectionError: false,
    },
    shippingViewId: null,
    notification: null,
    currentTab: "sales_info" as SalesTabs,
    tabs: [] as { name: SalesTabs; label?; show?: boolean }[],
    showTabs: false,
    tabPageLoading: false,
    tabPageLoadingTitle: null as any,
    tabLoadFailed: false,
    showFooter: false,
    adminMode: false,
};
function createTab(name: SalesTabs, label?, show = true) {
    return { name, label: label || name?.split("_")?.join(" "), show };
}
export const salesTabs = {
    admin: [
        createTab("sales_info"),
        createTab("items", "production"),
        // createTab("productions"),
        // createTab("payments"),
        createTab("transactions"),
        createTab("shipping"),
        createTab("shipping_overview", null, false),
        createTab("shipping_form", null, false),
        createTab("notification"),
    ],
    productionTasks: [createTab("items"), createTab("production_note")],
    quotes: [
        createTab("sales_info"),
        createTab("items"),
        // createTab("payments"),
        // createTab("shipping"),
        createTab("notification"),
    ],
};
type Action = ReturnType<typeof funcs>;
export type Data = typeof data;
type CustomerStore = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
    return {
        update: <K extends FieldPath<Data>>(k: K, v: FieldPathValue<Data, K>) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                const d = dotSet(newState);
                d.set(k, v);
                return newState;
            }),
        reset: (props: Partial<Data>) =>
            set((state) => ({
                ...data,
                ...props,
            })),
    };
}
export const salesOverviewStore = create<CustomerStore>((set) => ({
    ...data,
    ...funcs(set),
}));
