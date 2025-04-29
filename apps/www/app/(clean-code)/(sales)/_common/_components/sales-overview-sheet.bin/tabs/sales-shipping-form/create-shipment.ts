import { toast } from "sonner";
import { UseSalesShipmentForm } from "./ctx";
import { sum } from "@/lib/utils";
import {
    createSalesDispatchAction,
    CreateSalesDispatchData,
} from "../../../../data-actions/dispatch-actions/create-dispatch-action";
import { loadPageData, refreshTabData } from "../../helper";
import { resetSalesStatAction } from "../../../../data-actions/sales-stat-control.action";

export async function createSalesShipment(ctx: UseSalesShipmentForm) {
    try {
        const { form, store } = ctx;

        const data = form.getValues();
        const selection = data.selection;
        let shippingQty = 0;

        const items: CreateSalesDispatchData["items"] = Object.values(selection)
            .map((s) => {
                const totalSelect = sum([s.lh, s.rh, s.qty]);
                shippingQty += totalSelect;
                s.shipInfo?.inputs?.map((a) => {
                    if (a.available < s[a.formKey])
                        throw new Error(
                            "Dispatch qty must be less or equal to dispatchables"
                        );
                });
                return {
                    uid: s.itemControlUid,
                    rh: +s.rh,
                    lh: +s.lh,
                    qty: +s.qty,
                    produceable: s.shipInfo?.produceable,
                    // pendingProdQty: sum([
                    //     s.shipInfo?.pendingAssignmentQty,
                    //     s.shipInfo?.pendingProductionQty,
                    // ]),
                };
            })
            .filter((a) => sum([a.rh, a.lh, a.qty]) > 0);
        if (!data.dispatchMode) throw new Error("Select dispatch mode");
        if (!shippingQty) throw new Error("Select dispatch Items");
        await createSalesDispatchAction({
            items,
            driverId: +data.assignedToId,
            deliveryMode: data.dispatchMode,
            salesId: store.overview?.id,
            status: data.status,
        });
        setTimeout(async () => {
            await resetSalesStatAction(store.overview?.id);
            toast.success("Dispatch Created!");
            store.update("currentTab", "shipping");
            refreshTabData("shipping");
        }, 200);
        // await new Promise((resolve) =>
        //     setTimeout(() => {
        //         resolve(null);
        //     }, 2000)
        // );
    } catch (error) {
        if (error instanceof Error) toast.error(error.message);
    }
}
