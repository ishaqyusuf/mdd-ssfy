import { useState } from "react";
import { Icons } from "@/components/_v1/icons";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { Minimize } from "lucide-react";
import { useForm } from "react-hook-form";
// import { updateItemControlAction } from "../../../../data-actions/item-control.action";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { createItemAssignmentAction } from "../../../../data-actions/production-actions/item-assign-action";
import { getSalesProdWorkersAsSelectOption } from "../../../../use-case/sales-prod-workers-use-case";
import { ItemControlMenu } from "../../components/item-control-menu";
import {
    AdminOnly,
    getOpenItem,
    getPendingAssignments,
    loadPageData,
} from "../../helper";
import { salesOverviewStore } from "../../store";
import { ItemAssignments } from "./assignments";

export function ItemOverview({}) {
    const store = salesOverviewStore();
    const itemView = getOpenItem();
    const pendingAssignment = itemView.produceable
        ? itemView.status.qty.total - itemView.status.prodAssigned.total
        : 0;
    const [showForm, setShowForm] = useState<"assign" | "config">(null);
    if (!itemView.status.qty) return;
    return (
        <div className="p-4">
            <div>
                <div className="grid grid-cols-2 gap-2">
                    {itemView.itemConfigs?.map((config, index) => (
                        <div
                            className={cn("font-mono text-sm", "bg-white p-1")}
                            key={index}
                        >
                            <div className="uppercase">{config?.label}: </div>
                            <div
                                className={cn(
                                    "font-mono font-bold uppercase",
                                    config.color == "red" && "text-red-700",
                                )}
                            >
                                {config?.value}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <AdminOnly>
                        <Button
                            onClick={() => setShowForm("assign")}
                            disabled={!pendingAssignment || !!showForm}
                            className="w-full"
                            size="xs"
                        >
                            <Icons.add className="mr-2 size-4" />
                            <span>ASSIGN</span>
                            <span className="px-2">({pendingAssignment})</span>
                        </Button>
                        <Menu disabled={!!showForm}>
                            {/* <Menu.Item onClick={() => setShowForm("config")}>
                                Item Config
                            </Menu.Item> */}
                            <Menu.Item>Assign All</Menu.Item>
                            <Menu.Item>Mark As Completed</Menu.Item>
                            <ItemControlMenu
                                totalQty={itemView?.status?.qty?.total}
                                produceable={itemView?.produceable}
                                shippable={itemView?.shippable}
                            />
                        </Menu>
                        <Button
                            disabled={!!showForm}
                            onClick={() => {
                                store.update("itemViewId", null);
                            }}
                            size="icon"
                            variant="secondary"
                            className="h-8"
                        >
                            <Minimize className="size-4" />
                        </Button>
                    </AdminOnly>
                </div>
                {showForm == "config" && (
                    <ConfigForm onClose={() => setShowForm(null)} />
                )}
                {showForm == "assign" && (
                    <AssignForm
                        totalQty={pendingAssignment}
                        onClose={() => setShowForm(null)}
                    />
                )}
                {!showForm && (
                    <>
                        <Note
                            tagFilters={[
                                noteTagFilter(
                                    "itemControlUID",
                                    itemView?.itemControlUid,
                                ),
                                noteTagFilter("salesItemId", itemView?.itemId),
                                noteTagFilter("salesId", store?.salesId),
                                // noteTagFilter("status", ""),
                            ]}
                            subject={itemView?.title}
                            headline={itemView?.inlineSubtitle}
                            typeFilters={["production"]}
                        />
                        <ItemAssignments />
                    </>
                )}
            </div>
        </div>
    );
}
function ConfigForm({ onClose }) {
    const store = salesOverviewStore();
    const itemView = getOpenItem();
    const form = useForm({
        defaultValues: {
            produceable: itemView.produceable,
            shippable: itemView.shippable,
        },
    });
    async function save() {
        const data = form.getValues();
        // await updateItemControlAction(
        //     itemView.itemControlUid,
        //     {
        //         ...data,
        //     },
        //     {
        //         qty: itemView?.status?.qty || {},
        //         totalQty: itemView?.status?.qty?.total,
        //         produceableChanged: itemView.produceable != data.produceable,
        //         shippableChanged: itemView.shippable != data.shippable,
        //     }
        // );
        onClose();
        toast.success("saved");
        loadPageData({ dataKey: "itemOverview", reload: true });
    }
    return (
        <Form {...form}>
            <div className="flex items-center justify-end gap-4 border-y py-4">
                <FormCheckbox
                    control={form.control}
                    name="produceable"
                    label="Produceable"
                />
                <FormCheckbox
                    control={form.control}
                    name="shippable"
                    label="Shippable"
                />
                {/* <div className="flex-1"></div> */}
                <div className="flex gap-2">
                    <Button onClick={save} className="" size="xs">
                        Save
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onClose}
                        className=""
                        size="xs"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Form>
    );
}
type AssignFormProps = {
    onClose;
    totalQty;
};
function AssignForm({ onClose, totalQty }: AssignFormProps) {
    const pendings = getPendingAssignments();

    const itemView = getOpenItem();
    const form = useForm({
        defaultValues: {
            assignedToId: null,
            dueDate: null,
            lh: null,
            rh: null,
            qty: null,
            ...pendings?.data,
        },
    });
    const store = salesOverviewStore();
    const workers = useEffectLoader(getSalesProdWorkersAsSelectOption);
    async function assign() {
        const data = form.getValues();
        await createItemAssignmentAction({
            salesItemId: itemView.itemId,
            doorId: itemView.doorId,
            // assignedToId: data.assignedToId,
            // dueDate: data.dueDate,
            ...data,
            uid: itemView.itemControlUid,
            salesId: store.salesId,
            totalQty: itemView.status.qty.total,
            produceable: itemView?.produceable,
        });
        onClose();
        toast.success("saved");
        loadPageData({ dataKey: "itemOverview", reload: true });
    }
    return (
        <Form {...form}>
            <div className="my-4 flex justify-end">
                <div className="space-y-4 sm:w-4/5">
                    <div className="grid grid-cols-2 items-end gap-2">
                        <FormSelect
                            size="sm"
                            options={workers?.data || []}
                            label={"Assign To"}
                            name="assignedToId"
                            control={form.control}
                        />
                        <DatePicker
                            control={form.control}
                            name="dueDate"
                            size="sm"
                            label="Due Date"
                        />

                        {pendings.forms?.map((p) => (
                            <FormSelect
                                key={p.label}
                                size="sm"
                                options={p.options}
                                label={p.label?.toUpperCase()}
                                name={p.label}
                                control={form.control}
                            />
                        ))}
                    </div>
                    <div className="flex  justify-end gap-2">
                        <Button
                            onClick={onClose}
                            variant="destructive"
                            className=""
                            size="xs"
                        >
                            Cancel
                        </Button>
                        <Button onClick={assign} className="" size="xs">
                            Assign
                        </Button>
                    </div>
                </div>
            </div>
        </Form>
    );
}
