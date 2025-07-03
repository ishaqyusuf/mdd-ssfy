// import { ISalesOrder, ISalesOrderItem } from "@/types/ISales";
import { INotification } from "@/app/(v1)/_actions/notifications";
import {
    Builders,
    Customers,
    CustomerTypes,
    EmployeeProfile,
    HomeTemplates,
    Projects,
    Roles,
    Users,
} from "@/db";
import { deepCopy } from "@/lib/deep-copy";
import { formatDate } from "@/lib/use-day";
import {
    ExtendedHome,
    ICommunityTemplate,
    IHome,
    IProject,
} from "@/types/community";
import { ICustomer } from "@/types/customers";
import { IProduct } from "@/types/product";
import { IOrderPrintMode, ISalesOrder, ISalesOrderItem } from "@/types/sales";
import { InstallCostSettings } from "@/types/settings";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { store } from ".";

export interface ISlicer {
    installCostSetting: InstallCostSettings;
    order: ISalesOrder;
    productionUsers: Users[];
    assignProduction: ISalesOrder;
    orderProdView: Boolean;
    orderTimeline: ISalesOrder;
    prodItemUpdate: {
        item: ISalesOrderItem;
        action: "Complete" | "Cancel";
    };
    templateFormSuggestion: {
        [id in string]: string;
    };
    applyPayment: ISalesOrder[];
    notifications: INotification[];
    printHomes: {
        homes: ExtendedHome[];
        design: {
            [id in string]: string;
        };
    };
    printOrders: {
        mode: IOrderPrintMode;
        ids: number[];
        showInvoice?: Boolean;
        packingList?: Boolean;
        isProd?: Boolean;
        mockup?: Boolean;
        pdf?: Boolean;
        isClient?: Boolean;
    };
    printUnits: string[];
    modal: {
        name: ModalName;
        data: any;
    };
    dataPage: {
        id;
        data;
    };
    products: any[];
    productionTasks: string[];
    // staticList: IStaticList;
    staticCustomerProfiles: CustomerTypes[];
    staticBuilders: Builders[];
    staticProjects: IProject[];
    staticCommunity: ICommunityTemplate[];
    staticModels: HomeTemplates[];
    staticRoles: Roles[];
    staticEmployeeProfiles: EmployeeProfile[];
    staticPayableEmployees: Users[];
    staticTechEmployees: Users[];
    staticInstallers: Users[];
    staticSalesCustomers: Customers[];
    staticProducts: any[];
    staticProductCategories: string[];
    staticList: any[];
    refreshToken: string | undefined;
    href: null;
}

export type ModalName =
    | "assignTask"
    | "activateProduction"
    | "backOrder"
    | "builder"
    | "customerServices"
    | "catalog"
    | "customerProfile"
    | "communityTemplate"
    | "communityModelCost"
    | "communityInstallCost"
    | "deleteTransactionPrompt"
    | "deletePaymentPrompt"
    | "employee"
    | "employeeProfile"
    | "editInvoice"
    | "home"
    | "img"
    | "installCost"
    | "inspectBackOrder"
    | "inboundModal"
    | "importModelTemplate"
    | "jobOverview"
    | "modelTemplate"
    | "modelCost"
    | "paymentOverview"
    | "pickup"
    | "prodItemUpdate"
    | "product"
    | "salesAddressForm"
    | "salesTimeline"
    | "salesSupply"
    | "submitJob"
    | "verifyTaskJobs"
    | "uploadDoc"
    | undefined;
const initialState: ISlicer = {
    installCostSetting: null as any,
    modal: {
        name: undefined,
        data: null,
        staticList: {},
    },
} as Partial<ISlicer> as any;
const headerNavSlice = createSlice({
    name: "slicers",
    initialState,
    reducers: {
        updateSlice(
            state,
            action: PayloadAction<{ key: keyof ISlicer; data }>,
        ) {
            const { key, data } = action.payload;
            // Object.entries(data).map(([k, v]) => {
            //         //   if (v instanceof Date) data[k] = formatDate(v);
            //   if (typeof v == "object") data[k] = transformObject(v);
            // });
            const d = transformReduxObject(data);
            state[key as any] = d;
        },
    },
});
export function transformReduxObject(data) {
    if (!data) return;

    try {
        if (data)
            Object.entries(data).map(([k, v]) => {
                if (v instanceof Date) data[k] = formatDate(v);
                else if (typeof v == "object" && v != null) {
                    data[k] = transformReduxObject(v);
                }
            });
    } catch (error) {}
    return data;
}
export default headerNavSlice.reducer;
export const { updateSlice } = headerNavSlice.actions;
export function dispatchSlice(key: keyof ISlicer, data: any = null) {
    // if (data) data = deepCopy(data);
    store.dispatch(
        updateSlice({
            key,
            data: deepCopy(data),
        }),
    );
}

export async function loadStaticList(key: keyof ISlicer, list, _loader) {
    if (!list || list == undefined) {
        const data = await _loader();
        dispatchSlice(key, deepCopy(data));
    }
}
export function navigateTo(href) {
    store.dispatch(
        updateSlice({
            key: "href",
            data: href,
        }),
    );
}
