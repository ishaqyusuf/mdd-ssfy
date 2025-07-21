import { useEffect } from "react";
import Portal from "@/components/_v1/portal";
import ProgressStatus from "@/components/_v1/progress-status";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { cn, generateRandomString, sum } from "@/lib/utils";
import {
    CheckCircle,
    ClipboardList,
    ClipboardX,
    PackageCheck,
    Send,
} from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Form } from "@gnd/ui/form";

import { dispatchModes } from "../../../../utils/contants";
import { ItemControlMenu } from "../../components/item-control-menu";
import { salesOverviewStore } from "../../store";
import { createSalesShipment } from "./create-shipment";
import {
    ItemShippable,
    Shippable,
    UseSalesShipmentForm,
    useSalesShipmentForm,
} from "./ctx";

export function SalesShippingForm({}) {
    const ctx = useSalesShipmentForm();
    const { form, itemView, store, totalSelected, selectionError } = ctx;
    if (!itemView || !ctx.loaded) return null;
    const toggleTok = form.watch("selectAllToken");
    // const allChecked =
    return (
        <Form {...form}>
            <div className="">
                <Portal nodeId={"tabHeader"}>
                    <div className="flex items-center gap-4 border-b py-2">
                        <div className="flex-1">
                            <FormSelect
                                size="xs"
                                className=""
                                options={dispatchModes}
                                control={form.control}
                                name="dispatchMode"
                                placeholder={"Dispatch Mode"}
                            />
                        </div>
                        <div className="flex-1">
                            <FormSelect
                                size="xs"
                                className=""
                                options={store.dispatchUsers}
                                titleKey="name"
                                valueKey="id"
                                control={form.control}
                                name="assignedToId"
                                placeholder={"Assigned To"}
                            />
                        </div>
                        <Button
                            // disabled={!totalSelected || selectionError}
                            onClick={() => {
                                form.setValue(
                                    "selectAllToken",
                                    generateRandomString(),
                                );
                            }}
                            variant="secondary"
                            className=""
                        >
                            Select All Available
                        </Button>
                        <Button
                            action={async () => {
                                await createSalesShipment(ctx);
                            }}
                            className=""
                        >
                            Save
                        </Button>
                    </div>
                </Portal>
                {itemView?.items
                    ?.filter((a, i) => !a.hidden)
                    .map((item, uid) => (
                        <ShippingItem ctx={ctx} key={uid} item={item} />
                    ))}
            </div>
        </Form>
    );
}
function ShippingItem({
    item,
    ctx,
}: {
    ctx: UseSalesShipmentForm;
    item: Shippable["item"];
}) {
    const status = item.status;
    const store = salesOverviewStore();
    const form = ctx.form;
    const uid = item.itemControlUid;
    const selectData = store.shippingForm?.selection?.[uid];

    const [lh, rh, qty, total, shipInfo] = form.watch([
        `selection.${uid}.lh`,
        `selection.${uid}.rh`,
        `selection.${uid}.qty`,
        `selection.${uid}.total`,
        `selection.${uid}.shipInfo` as any,
    ]);
    // const { lh, rh, qty, total, shipInfo } = selectData || {};
    useEffect(() => {
        const _total = sum([lh, rh, qty]);
        const deliverableQty = shipInfo?.deliverableQty;
        form.setValue(`selection.${uid}.total`, _total);
        // ctx.updateSelection(uid, "total", _total);
    }, [lh, rh, qty, shipInfo]);
    useEffect(() => {
        let shipping: ItemShippable = {
            inputs: [],
            deliveryCreatedQty: 0,
            pendingAssignmentQty: 0,
            pendingDeliveryQty: 0,
            deliverableQty: 0,
            pendingProductionQty: 0,
            qty: 0,
            produceable: item.produceable,
            shippable: item.shippable,
        };
        function qtyShip(k: "lh" | "rh" | "qty") {
            function getValue(fromStatus: keyof typeof status) {
                // status.prodAssigned?.autoComplete
                return status?.[fromStatus]?.[k] || 0;
            }
            function getValues(fromStatus: (keyof typeof status)[]) {
                return fromStatus?.map((a) => getValue(a));
            }
            let shippedQty = sum(
                getValues([
                    "dispatchAssigned",
                    "dispatchCompleted",
                    "dispatchInProgress",
                ]),
            );

            let totalQty = getValue("qty");
            let producedQty = getValue("prodCompleted");
            let assignProdQty = getValue("prodAssigned");

            shipping.deliveryCreatedQty += shippedQty;
            shipping.qty += totalQty;
            const pendingAssQty = status?.prodAssigned?.autoComplete
                ? 0
                : sum([totalQty, -1 * assignProdQty]);
            shipping.pendingAssignmentQty += pendingAssQty;
            const pendingDelivery = sum([totalQty, -1 * shippedQty]);
            shipping.pendingDeliveryQty += pendingDelivery;
            const pendingProdQty = sum([assignProdQty, -1 * producedQty]);
            shipping.pendingProductionQty += pendingProdQty;
            const deliverable = sum([
                producedQty,
                item.produceable ? 0 : sum([pendingProdQty, pendingAssQty]),
                -1 * shippedQty,
            ]);

            shipping.deliverableQty += deliverable;
            shipping.inputs.push({
                delivered: shippedQty,
                available: deliverable,
                unavailable: sum([pendingDelivery, -1 * deliverable]),
                formKey: k,
                label: k,
                total: deliverable,
                // available: deliverableQty,
            });
        }
        qtyShip("lh");
        qtyShip("rh");
        qtyShip("qty");

        // ctx.updateSelection(uid, "shipInfo", shipping);
        form.setValue(`selection.${uid}.shipInfo`, shipping);
    }, []);
    // const form = useFormContext();
    async function submitAllPendingProduction() {}
    return (
        <div className={cn("border-b px-4 py-2", total > 0 && "bg-green-50")}>
            {/* {JSON.stringify(shipInfo || {})} */}

            <div className="flex gap-4">
                <div className="">
                    <CheckCircle
                        className={cn(
                            "size-4",
                            total > 0 ? "text-green-500" : "opacity-0",
                        )}
                    />
                </div>
                <div className="flex-1  space-y-2">
                    <div className="flex-1 cursor-pointer">
                        <div className="font-mono text-sm font-semibold uppercase text-muted-foreground">
                            <span>{item.inlineSubtitle}</span>
                        </div>
                        {/* <div className="uppercase text-muted-foreground text-sm font-normal space-x-2">
                            <span>{item.sectionTitle}</span>
                            <span>{item.subtitle}</span>
                            <span>{item.swing}</span>
                        </div> */}
                        <div className="text-sm font-semibold uppercase">
                            {item?.title}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {shipInfo?.inputs?.filter((a) => a.available)
                            ?.length ? null : (
                            <>
                                {/* {!shipInfo.deliveryCreatedQty || ( */}
                                {!!!shipInfo?.qty || (
                                    <ProgressStatus
                                        noDot
                                        color={"blue"}
                                        status={`${shipInfo?.deliveryCreatedQty}/${shipInfo?.qty} item shipped`}
                                    />
                                )}
                                {/* )} */}
                                {!!!shipInfo?.pendingAssignmentQty || (
                                    <ProgressStatus
                                        color={"red"}
                                        noDot
                                        status={`${shipInfo?.pendingAssignmentQty} not assigned`}
                                    />
                                )}
                                {!!!shipInfo?.pendingProductionQty || (
                                    <ProgressStatus
                                        color={"orange"}
                                        noDot
                                        status={`${shipInfo?.pendingProductionQty} pending production`}
                                    />
                                )}
                                {/* {shipInfo. && (
                                    <ProgressStatus
                                        color={"blue"}
                                        status={`${shipInfo.pendingAssignmentQty} pending production`}
                                    />
                                )} */}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {shipInfo?.inputs?.map((input, ii) => (
                            <QtyInput
                                uid={item.itemControlUid}
                                input={input}
                                key={ii}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-2 hidden">
                    <Menu>
                        <Menu.Item
                            Icon={Send}
                            SubMenu={
                                <>
                                    <Menu.Item
                                        Icon={PackageCheck}
                                        shortCut={
                                            <>
                                                {shipInfo?.pendingProductionQty +
                                                    shipInfo?.pendingAssignmentQty}
                                            </>
                                        }
                                        disabled={
                                            !shipInfo?.pendingProductionQty &&
                                            !shipInfo?.pendingAssignmentQty
                                        }
                                    >
                                        All Productions
                                    </Menu.Item>
                                    <Menu.Item
                                        Icon={ClipboardList}
                                        disabled={
                                            !shipInfo?.pendingProductionQty
                                        }
                                        shortCut={
                                            <>
                                                {shipInfo?.pendingProductionQty}
                                            </>
                                        }
                                    >
                                        Assigned Productions
                                    </Menu.Item>
                                    <Menu.Item
                                        Icon={ClipboardX}
                                        disabled={
                                            !shipInfo?.pendingAssignmentQty
                                        }
                                        shortCut={
                                            <>
                                                {shipInfo?.pendingAssignmentQty}
                                            </>
                                        }
                                    >
                                        Unassigned Productions
                                    </Menu.Item>
                                </>
                            }
                        >
                            Submit
                        </Menu.Item>
                        <ItemControlMenu
                            totalQty={item?.status?.qty?.total}
                            produceable={item?.produceable}
                            shippable={item?.shippable}
                        />
                    </Menu>
                </div>
            </div>
        </div>
    );
}
function QtyInput({ uid, input }) {
    let available = input.available;
    // available = 100;

    const form = useFormContext();
    const w = form.watch("selectAllToken");
    useEffect(() => {
        if (w) {
            form.setValue(`selection.${uid}.${input.formKey}`, available);
        }
    }, [w]);
    if (!available) return null;

    const inputOptions = Array(available + 1)
        ?.fill(0)
        .map((a, i) => i?.toString());

    return (
        <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-semibold uppercase">
                {input.label}:
            </span>
            {/* {inputOptions.length > 15 ? ( */}
            <FormInput
                className="w-20"
                type="number"
                size="sm"
                control={form.control}
                name={`selection.${uid}.${input.formKey}`}
            />
            {/* // ) : (
            //     <FormSelect
            //         size="sm"
            //         className="w-20"
            //         control={form.control}
            //         name={`selection.${uid}.${input.formKey}`}
            //         options={inputOptions}
            //     />
            // )} */}
            <span className="font-mono text-xs font-bold">/{available}</span>
        </div>
    );
}
