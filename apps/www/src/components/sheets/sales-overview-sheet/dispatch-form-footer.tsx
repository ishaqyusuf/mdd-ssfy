import { redirect } from "next/navigation";
import {
    createAssignmentSchema,
    createSubmissionSchema,
} from "@/actions/schema";
import { SubmitButton } from "@/components/submit-button";
import { useDispatcherAction } from "@/hooks/use-dispatcher-action";
import { generateRandomString, sum } from "@/lib/utils";
import { qtyMatrixDifference } from "@/utils/sales-control-util";
import { useSession } from "next-auth/react";
import { useFormContext } from "react-hook-form";
import z from "zod";

import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useDispatch } from "./context";
import { useTaskTrigger } from "@/hooks/use-task-trigger";

type SubmitSchema = z.infer<typeof createSubmissionSchema>;
export function DispatchFormFooter({}) {
    const ctx = useDispatch();
    const { form } = ctx;
    const { openForm, setOpenForm } = ctx;
    const onCancel = () => {
        setOpenForm(false);
    };

    // const form = ctx.form();
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const action = useDispatcherAction();
    if (!openForm) return null;
    const taskTrigger = useTaskTrigger({});
    const handleSubmit = (formData: z.infer<typeof ctx.formSchema>) => {
        const data = ctx.bachWorker.emptyActions();
        ctx.data?.dispatchables?.map((item) => {
            const itemData = formData?.itemData?.items?.[item.uid];
            let qty = itemData?.qty;
            let handle = false;
            if (qty?.lh || qty?.rh) {
                qty.qty = sum([qty.lh, qty.rh]);
                handle = true;
            }
            item.dispatchStat?.map((ds) => {
                if (qty.qty == 0) return;
                const pickQty = { ...ds.available };
                const remaining = qtyMatrixDifference(qty, ds.available);
                if (handle) {
                    if (remaining.lh >= 0) {
                        qty.lh = remaining.lh;
                    } else {
                        qty.lh = 0;
                        pickQty.lh = qty.lh;
                    }
                    if (remaining.rh >= 0) {
                        qty.rh = remaining.rh;
                    } else {
                        qty.rh = 0;
                        pickQty.rh = qty.rh;
                    }
                    pickQty.qty = sum([pickQty.rh, pickQty.lh]);
                    qty.qty = sum([qty.rh, qty.lh]);
                } else {
                    if (remaining.qty >= 0) {
                        qty.qty = remaining.qty;
                    } else {
                        qty.qty = 0;
                        pickQty.qty = qty.qty;
                    }
                }
                if (pickQty.qty)
                    data.dispatchItems[generateRandomString()] = {
                        submissionId: ds.submissionId,
                        qty: pickQty,
                    };
            });
            if (qty.qty) {
                const tok = generateRandomString(5);
                data.assignmentActions[item.uid] = {
                    meta: {
                        qty,
                        pending: qty,
                        itemUid: item.uid,
                        itemsTotal: item.totalQty,
                        salesId: ctx.data?.id,
                        salesDoorId: item.doorId,
                        salesItemId: item.itemId,
                    } as z.infer<typeof createAssignmentSchema>,
                    uid: item.uid,
                    assignmentId: null as any,
                    submitTok: tok,
                };
                // if (!data.submissionActions[item.uid]) {
                data.submissionMeta[item.uid] = {
                    itemUid: item.uid,
                    itemId: item.itemId,
                    salesId: ctx.data?.id,
                    submittedById: session?.data?.user?.id,
                };
                data.submissionActions[`${tok}_${item.uid}`] = {
                    status: null,
                    meta: {
                        qty: qty,
                        pending: qty,
                        assignmentId: null,
                    } as SubmitSchema,
                };
                // }
                data.dispatchItems[item.uid] = {
                    submissionId: null,
                    qty,
                    status: null,
                };
            }
        });
        data.dispatch = {
            deliveryDate: formData.delivery?.deliveryDate,
            deliveryMode: formData?.delivery?.deliveryMode,
            orderId: formData?.delivery?.orderId,
            driverId: formData?.delivery?.driverId,
            status: formData?.delivery?.status,
        };
        ctx.bachWorker.form.reset({
            nextTriggerUID: null,
            actions: data,
        });
        ctx.bachWorker.loader.loading("Creating dispatch...");
        ctx.bachWorker.start();
    };
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                <div className="flex justify-end space-x-2">
                    <SubmitButton
                        isSubmitting={ctx?.bachWorker?.executing}
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </SubmitButton>
                    <Button
                        onClick={(e) => {
                            action.handleDispatch(form.getValues());
                        }}
                        type="submit"
                    >
                        Create Dispatch
                    </Button>
                </div>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
