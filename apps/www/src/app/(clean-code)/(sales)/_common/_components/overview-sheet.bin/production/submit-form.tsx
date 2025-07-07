import NumberPicker from "@/components/(clean-code)/custom/controlled/number-picker";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import { cn, sum } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";

import {
    AssignmentSubmitForm,
    submitAssignmentUseCase,
} from "../../../use-case/sales-prod.use-case";
import { ItemAssignment } from "../item-view/sales-items-overview";
import { useItemProdViewContext } from "./use-hooks";

interface Props {
    assignment: ItemAssignment;
}
export default function SubmitProductionForm({ assignment }: Props) {
    const ctx = useItemProdViewContext();
    const { mainCtx, item } = ctx;
    const form = useForm<AssignmentSubmitForm>({
        defaultValues: {
            qty: 0,
            lhQty: 0,
            rhQty: 0,
            note: "",
            salesOrderItemId: item.salesItemId,
            assignmentId: assignment.id,
            salesOrderId: item.orderId,
        },
    });
    const pending = assignment.pending;
    const hasBothSide = pending.lh && pending.rh;

    async function __sumbit() {
        try {
            const data = form.getValues();
            if (!data.lhQty && !data.qty && !data.rhQty)
                throw Error("Select valid qty");
            if (item.hasSwing) data.qty = sum([data.lhQty, data.rhQty]);
            await submitAssignmentUseCase(
                data,
                item.analytics.control.produceable,
            );
            toast.success("Submitted");
            mainCtx.refresh();
        } catch (error) {
            if (error instanceof Error) toast.error(error.message);
        }
    }
    return (
        <div className="grid gap-4 p-4">
            <Form {...form}>
                <div className={cn(hasBothSide && "grid grid-cols-2 gap-4")}>
                    {(item.hasSwing && pending.lh) || pending.qty ? (
                        <NumberPicker
                            control={form.control}
                            name={item.hasSwing ? "lhQty" : "qty"}
                            size="sm"
                            label={item.hasSwing ? "LH Qty" : "Qty"}
                            length={pending.lh || pending.qty}
                        />
                    ) : (
                        <></>
                    )}
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
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        type="textarea"
                        className="col-span-2"
                        control={form.control}
                        name="note"
                        label="Note"
                    />
                </div>
            </Form>
            <div className="flex justify-end">
                <Button size="sm" action={__sumbit}>
                    Submit
                </Button>
            </div>
        </div>
    );
}
