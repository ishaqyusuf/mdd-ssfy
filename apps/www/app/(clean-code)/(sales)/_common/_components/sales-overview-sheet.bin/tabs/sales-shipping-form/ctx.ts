import { FieldPath, useForm } from "react-hook-form";
import { salesOverviewStore } from "../../store";
import { DeliveryOption } from "@/types/sales";
import { GetSalesItemOverviewAction } from "../../../../data-actions/sales-items-action";
import {
    QtyControlByType,
    SalesDispatchStatus,
} from "@/app/(clean-code)/(sales)/types";
import { useEffect } from "react";

export type Shippable = {
    item: GetSalesItemOverviewAction["items"][number];
};
export type ItemShippable = {
    pendingAssignmentQty?: number;
    pendingProductionQty?: number;
    deliveryCreatedQty?: number;
    pendingDeliveryQty?: number;
    deliverableQty?: number;
    produceable?: boolean;
    shippable?: boolean;
    qty?: number;
    inputs: {
        label: string;
        available: number;
        total: number;
        delivered: number;
        unavailable: number;
        formKey: string;
    }[];
};
export type SelectionType = {
    [uid in string]: Partial<QtyControlByType["qty"]> & {
        selectionError?: boolean;
        shipInfo: ItemShippable;
    };
};
export type UseSalesShipmentForm = ReturnType<typeof useSalesShipmentForm>;
export type ShipmentForm = UseSalesShipmentForm["form"]["getValues"];
export function useSalesShipmentForm() {
    const store = salesOverviewStore();
    const itemView = store.itemOverview;
    const form = useForm({
        defaultValues: {
            selectAllToken: "",
            dispatchMode: "" as DeliveryOption,
            assignedToId: "",
            selection: {} as SelectionType,
            loaded: false,
            markAll: false,
            totalSelected: 0,
            selectionError: false,
            status: "queue" as SalesDispatchStatus,
        },
    });
    const [loaded, markAll, totalSelected, selectionError] = form.watch([
        "loaded",
        "markAll",
        "totalSelected",
        "selectionError",
    ]);
    // const { loaded, markAll, totalSelected, selectionError } =
    //     store.shippingForm;
    useEffect(() => {
        const selection: SelectionType = {};
        itemView?.items?.map((k) => {
            selection[k.itemControlUid] = {
                itemControlUid: k.itemControlUid,
                lh: 0,
                rh: 0,
                total: 0,
                qty: 0,
                shipInfo: {} as any,
            };
        });
        // store.update("shippingForm", {
        //     selection,
        // } as any);
        form.reset({
            selection,
            loaded: false,
        });
        setTimeout(() => {
            form.setValue("loaded", true);
        }, 100);
    }, [itemView, store.currentTab]);

    return {
        itemView,
        loaded,
        form,
        store,
        totalSelected,
        selectionError,
        updateSelection(uid, dot: FieldPath<SelectionType[number]>, value) {
            console.log({ dot, uid, value });
            store.update(`shippingForm.selection.${uid}.${dot}`, value);
        },
    };
}
