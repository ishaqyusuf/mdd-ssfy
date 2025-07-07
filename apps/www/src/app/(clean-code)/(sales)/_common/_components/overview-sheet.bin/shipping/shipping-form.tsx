import { createContext, useContext, useEffect } from "react";
import NumberPicker from "@/components/(clean-code)/custom/controlled/number-picker";
import { SecondaryTabSheet } from "@/components/(clean-code)/data-table/item-overview-sheet";
import Button from "@/components/common/button";
import FormSelect from "@/components/common/controls/form-select";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import {
    createSalesDispatchUseCase,
    SalesDispatchForm,
    salesDispatchFormUseCase,
} from "../../../use-case/sales-dispatch-use-case";
import { GetSalesOverview } from "../../../use-case/sales-item-use-case";
import { useItemProdViewContext } from "../production/use-hooks";

const useShippingFormCtx = () => {
    const ctx = useItemProdViewContext();
    const { mainCtx, item } = ctx;
    const form = useForm<SalesDispatchForm>({
        defaultValues: {},
    });
    useEffect(() => {
        salesDispatchFormUseCase(mainCtx.overview?.shipping).then((resp) => {
            form.reset(resp);
        });
    }, []);

    return {
        mainCtx,
        form,
        item,
        dispatchables: mainCtx.overview?.shipping?.dispatchableItemList,
    };
};
const ShippingFormCtx = createContext<ReturnType<typeof useShippingFormCtx>>(
    null as any,
);

export function ShippingForm({}) {
    const ctx = useShippingFormCtx();
    const { mainCtx, form, dispatchables } = ctx;
    const watchToggle = form.watch("toggleAll");
    function toggleAllAvailble() {
        const sels = {};
        if (!watchToggle) {
            const selections = form.getValues("selection");
            dispatchables
                ?.filter((d) => d.deliverable)
                .map((d) => {
                    sels[d.uid] = {
                        ...(selections?.[d.uid] || {}),
                        itemId: d.id,
                        selected: !selections?.[d.uid]?.selected,
                    };
                });
        }
        form.setValue("selection", sels);
        form.setValue("toggleAll", !watchToggle);
    }

    async function createDispatch() {
        const data = form.getValues();
        if (!data.delivery.deliveryMode) {
            toast.error("Select Delivery Mode");
            return;
        }
        createSalesDispatchUseCase(data)
            .then((resp) => {
                toast.success("Shipping created");
                ctx.mainCtx.refresh();
                ctx.mainCtx.closeSecondaryTab();
            })
            .catch((e) => {
                if (e instanceof Error) toast.error(e.message);
            });
    }
    return (
        <ShippingFormCtx.Provider value={ctx}>
            <div className="secondary-tab flex flex-col">
                <SecondaryTabSheet
                    title="Create Shipping"
                    onBack={() => mainCtx.closeSecondaryTab()}
                ></SecondaryTabSheet>
                {/* <ScrollArea className="w-[600px] h-[80vh] flex flex-col"> */}
                <ScrollArea className="o-scrollable-content-area ">
                    <Form {...form}>
                        <div className="flex gap-4 border-b p-4">
                            <div className="flex items-center gap-2">
                                <Label>Dispatch Mode</Label>
                                <FormSelect
                                    control={form.control}
                                    options={["delivery", "pickup"]}
                                    name="delivery.deliveryMode"
                                    className="w-28"
                                    size="sm"
                                />
                            </div>
                            <div className="flex-1"></div>
                            <Button
                                onClick={() => {
                                    ctx.mainCtx.refresh();
                                }}
                                size="sm"
                            >
                                Refresh
                            </Button>
                            <Button
                                onClick={toggleAllAvailble}
                                size="sm"
                                variant={watchToggle ? "secondary" : "ghost"}
                            >
                                Mark All
                            </Button>
                            <Button onClick={createDispatch} size="sm">
                                Create
                            </Button>
                        </div>
                        <ScrollArea className="flex h-[65vh] w-[600px] flex-col">
                            <div className="p-4">
                                {dispatchables?.map((item, index) => (
                                    <ShippingItemLine item={item} key={index} />
                                ))}
                            </div>
                        </ScrollArea>
                    </Form>
                </ScrollArea>
                {/* </ScrollArea> */}
            </div>
        </ShippingFormCtx.Provider>
    );
}
function ShippingItemLine({
    item,
}: {
    item: GetSalesOverview["shipping"]["dispatchableItemList"][number];
}) {
    const ctx = useContext(ShippingFormCtx);
    const { form } = ctx;
    const itemForm = form.watch(`selection.${item.uid}`);
    const deliverableQty = item.deliverableQty;
    const pending = item.analytics.pending;
    const hasHandle = deliverableQty.lh && deliverableQty.rh;
    return (
        <div className="flex flex-col border-b bg-white">
            <div
                className={cn(
                    "h-auto w-full flex-1 cursor-pointer justify-start p-2",
                    itemForm?.selected
                        ? "bg-muted-foreground/5"
                        : "hover:bg-muted-foreground/10",
                )}
                onClick={() => {
                    if (!deliverableQty.total) {
                        toast.error("No deliverable qty");
                        return;
                    }
                    const val = !itemForm?.selected;
                    form.setValue(`selection.${item.uid}.selected`, val);
                    form.setValue(`selection.${item.uid}.itemId`, item.id);
                    if (val && !itemForm?.deliveryQty) {
                        form.setValue(
                            `selection.${item.uid}.deliveryQty`,
                            deliverableQty,
                        );
                    }
                }}
            >
                <div className="flex w-full justify-start text-start">
                    <div className="flex-col space-y-2">
                        <span className="font-mono text-sm uppercase">
                            {item.title}
                        </span>
                        <div>
                            <Badge variant="secondary" className="font-mono">
                                Fulfilled: {item.totalDelivered}
                            </Badge>
                            <Badge variant="secondary" className="font-mono">
                                Pending: {item.pendingDelivery}
                            </Badge>
                            <Badge variant="secondary" className="font-mono">
                                Available: {item.deliverableQty?.total}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex-1"></div>
                    {itemForm?.selected ? (
                        <CheckCircle2Icon
                            className={cn(
                                "size-4",
                                itemForm?.selected && "text-green-500",
                            )}
                        />
                    ) : (
                        <></>
                    )}
                </div>
            </div>
            {itemForm?.selected && (
                <div>
                    {/* {JSON.stringify(item.analytics)} */}
                    <div className={cn(hasHandle && "grid grid-cols-2 gap-4")}>
                        {deliverableQty.lh || deliverableQty.qty ? (
                            <NumberPicker
                                inline={!hasHandle}
                                label={`Delivery Qty ${
                                    item.hasSwing ? "(LH)" : ""
                                }`}
                                size="sm"
                                control={form.control}
                                name={`selection.${item.uid}.deliveryQty.${
                                    item.hasSwing ? "lh" : "qty"
                                }`}
                                length={deliverableQty.lh || deliverableQty.qty}
                            />
                        ) : (
                            <></>
                        )}
                        {deliverableQty.rh ? (
                            <NumberPicker
                                inline={!hasHandle}
                                label={`Delivery Qty ${
                                    item.hasSwing && "(RH)"
                                }`}
                                size="sm"
                                control={form.control}
                                name={`selection.${item.uid}.deliveryQty.rh`}
                                length={deliverableQty.rh}
                            />
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
