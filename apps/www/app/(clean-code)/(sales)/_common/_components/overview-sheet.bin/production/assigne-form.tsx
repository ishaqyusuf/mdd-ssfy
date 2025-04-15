import { createContext, useContext, useEffect, useState } from "react";
import { Icons } from "@/components/_v1/icons";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import NumberPicker from "@/components/(clean-code)/custom/controlled/number-picker";
import Button from "@/components/common/button";
import FormSelect from "@/components/common/controls/form-select";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";

import { getSalesProdWorkersAsSelectOption } from "../../../use-case/sales-prod-workers-use-case";
import {
    createItemAssignmentUseCase,
    getItemAssignmentFormUseCase,
    ItemAssignmentForm,
} from "../../../use-case/sales-prod.use-case";
import { useItemProdView } from "./use-hooks";

function useAssignmentCtx() {
    const ctx = useItemProdView();
    const { item } = ctx;
    const [assignMode, setAssignMode] = useState(false);
    const pendingAssignments = item?.analytics?.pending?.assignment;
    const form = useForm<ItemAssignmentForm>({
        defaultValues: null,
    });
    useEffect(() => {
        if (assignMode) {
            getItemAssignmentFormUseCase(item).then((res) => {
                form.reset(res);
            });
        }
    }, [assignMode]);

    async function save() {
        const formData = form.getValues();
        // console.log(formData);
        await createItemAssignmentUseCase(
            formData,
            item.analytics.control.produceable,
        );

        toast.success("Created!");
        ctx.mainCtx.refresh();
    }
    return {
        save,
        setAssignMode,
        item,
        assignMode,
        form,
        pending: pendingAssignments,
    };
}
const Context = createContext<ReturnType<typeof useAssignmentCtx>>(null as any);
export function AssignForm({}) {
    const ctx = useAssignmentCtx();
    const { item, setAssignMode, assignMode, pending } = ctx;

    return (
        <Context.Provider value={ctx}>
            <Button
                onClick={() => {
                    setAssignMode(true);
                }}
                disabled={pending?.total == 0}
                variant="default"
                className={cn(
                    "w-full",
                    assignMode || (!pending.total && "hidden"),
                )}
            >
                <Icons.add className="mr-2 h-5 w-5" />
                <span>Assign</span>
                <span>({pending?.total})</span>
            </Button>
            {assignMode && <AssignmentForm />}
        </Context.Provider>
    );
}
function AssignmentForm({}) {
    const ctx = useContext(Context);
    const { form, pending, item } = ctx;
    const workers = useEffectLoader(getSalesProdWorkersAsSelectOption);
    return (
        <Form {...ctx.form}>
            <div className="mt-4 rounded-lg border bg-white">
                <div className="grid items-end gap-4 p-4 sm:grid-cols-2">
                    <FormSelect
                        size="sm"
                        options={workers?.data || []}
                        label={"Assign To"}
                        name="assignedTo.connect.id"
                        control={form.control}
                    />
                    <DatePicker
                        control={form.control}
                        name="dueDate"
                        size="sm"
                        label="Due Date"
                    />
                    {(item.hasSwing && pending.lh) || pending.qty ? (
                        <NumberPicker
                            control={form.control}
                            name={"lhQty"}
                            size="sm"
                            label={item.hasSwing ? "LH Qty" : "Qtyss"}
                            length={pending.lh || pending.qty}
                        />
                    ) : (
                        <></>
                    )}
                    {/* <NumberPicker
                        control={form.control}
                        name="lhQty"
                        size="sm"
                        label={pending.lh ? "LH Qty" : "Qty"}
                        length={pending.lh || pending.qty}
                    /> */}
                    {pending.rh ? (
                        <NumberPicker
                            control={form.control}
                            name="rhQty"
                            size="sm"
                            label="RH Qty"
                            length={pending.rh}
                        />
                    ) : null}
                </div>
                <div className="flex  justify-end gap-4 border-t p-4">
                    <Button
                        onClick={() => {
                            ctx.setAssignMode(false);
                        }}
                        size="sm"
                        variant="destructive"
                    >
                        Cancel
                    </Button>
                    <Button action={ctx.save} size="sm" variant="default">
                        Assign
                    </Button>
                </div>
            </div>
        </Form>
    );
}
