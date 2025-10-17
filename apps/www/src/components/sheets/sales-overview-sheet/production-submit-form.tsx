import { redirect } from "next/navigation";

import { createSubmissionSchema } from "@/actions/schema";
import { submitSalesAssignmentAction } from "@/actions/submit-sales-assignment";
import FormInput from "@/components/common/controls/form-input";
import { NumberInput } from "@/components/currency-input";
import { SubmitButton } from "@/components/submit-button";
import { useLoadingToast } from "@/hooks/use-loading-toast";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useController, useForm, useFormContext } from "react-hook-form";
import { NumericFormatProps } from "react-number-format";
import z from "zod";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";

import { useAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-tab";

export function ProductionSubmitForm({}) {
    const ctx = useAssignmentRow();
    const pending = ctx?.assignment?.pending;
    const { item, queryCtx } = useProductionItem();
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const form = useForm<z.infer<typeof createSubmissionSchema>>({
        resolver: zodResolver(createSubmissionSchema),
        defaultValues: {
            pending: {
                ...pending,
            },
            qty: {
                lh: pending.lh,
                rh: pending.rh,
                qty: pending.lh || pending.rh ? null : pending.qty,
                // ...item?.analytics?.assignment?.pending,
                // qty: !item.pending?.assignment?.noHandle
            },
            salesId: item.salesId,
            itemId: item.itemId,
            assignmentId: ctx.assignment.id,
            itemUid: item.controlUid,
            submittedById: session?.data?.user?.id,
        },
    });
    const formData = form.watch();

    const toast = useLoadingToast();
    const createSubmit = useAction(submitSalesAssignmentAction, {
        onSuccess(args) {
            toast.success("Submitted");
            toast.clearToastId();
            ctx.setOpenSubmitForm(false);
            queryCtx.salesQuery.productionUpdated();
        },
        onError(e) {
            toast.error("Unable to complete");
        },
    });

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((e) => {
                    toast.display({
                        title: "Creating assignment",
                        duration: Number.POSITIVE_INFINITY,
                    });
                    createSubmit.execute(e);
                })}
            >
                <div className="mt-4 space-y-3 border border-border p-3 duration-300 animate-in fade-in-50 slide-in-from-top-5">
                    <h5 className="text-sm font-medium">Submit Assignment</h5>
                    <div className="grid grid-cols-2 items-end gap-4">
                        {formData?.pending?.lh || formData?.pending?.rh ? (
                            <>
                                <QtyInput name="lh" />
                                <QtyInput name="rh" />
                            </>
                        ) : (
                            <>
                                <QtyInput name="qty" />
                                <div></div>
                            </>
                        )}
                        <div className="col-span-2">
                            <Collapsible>
                                <CollapsibleTrigger className="w-full">
                                    <Button
                                        className="w-full"
                                        size="xs"
                                        variant="secondary"
                                        type="button"
                                    >
                                        Note
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="mt-2">
                                        <FormInput
                                            type="textarea"
                                            control={form.control}
                                            name="note"
                                        />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                        <SubmitButton
                            isSubmitting={createSubmit.isExecuting}
                            disabled={
                                createSubmit.isExecuting ||
                                !form.formState.isValid
                            }
                        >
                            Submit
                        </SubmitButton>
                        <Button
                            variant="outline"
                            onClick={(e) => {
                                ctx.setOpenSubmitForm(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
function QtyInput({
    className,
    name,
    // label,
    ...props
}: Omit<NumericFormatProps, "value" | "onChange"> & {
    name: "lh" | "rh" | "qty";
    // label: string;
}) {
    const { control, getValues } = useFormContext();
    const pendingQty = getValues(`pending.${name}`);
    const {
        field: { value, onChange, onBlur },
    } = useController({
        name: `qty.${name}`,
        control,
    });
    return (
        <div className="grid gap-2">
            <Label className="flex justify-between uppercase">
                <span>
                    {name}
                    {name != "qty" ? " qty" : ``}
                </span>
                <span className="text-muted-foreground">
                    {pendingQty || 0} pending
                </span>
            </Label>
            <NumberInput
                onValueChange={(e) => {
                    let value = e.floatValue || null;
                    onChange(value, { shouldValidate: true });
                }}
                value={value}
                disabled={!pendingQty}
                max={2}
                className=""
                suffix={`/${pendingQty}`}
                {...props}
            />
        </div>
    );
}
