import { useEffect } from "react";
import { createSalesAssignmentAction } from "@/actions/create-sales-assignment";
import { getUsersListAction } from "@/actions/get-users-list";
import { createAssignmentSchema } from "@/actions/schema";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import FormSelect from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { DataSkeleton } from "@/components/data-skeleton";
import { SubmitButton } from "@/components/submit-button";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { timeout } from "@/lib/timeout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useController, useForm, useFormContext } from "react-hook-form";
import { NumericFormatProps } from "react-number-format";
import { useAsyncMemo } from "use-async-memo";
import z from "zod";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";

import { useProductionItem } from "./production-tab";

export function ProductionAssignmentForm({ closeForm }) {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const form = useForm<z.infer<typeof createAssignmentSchema>>({
        resolver: zodResolver(createAssignmentSchema),
        defaultValues: {
            pending: {
                ...item?.pending?.assignment,
            },
            qty: {
                // qty: !item.pending?.assignment?.noHandle
            },
            assignedToId: null,
            dueDate: null,
        },
    });
    useEffect(() => {
        let qy = item?.pending?.assignment;
        form.setValue("qty", {
            lh: qy.lh || undefined,
            rh: qy.rh || undefined,
            qty: !qy.lh && !qy.rh ? qy.qty : undefined,
        });
    }, [item]);
    const formData = form.watch();
    const data = useAsyncMemo(async () => {
        await timeout(100);
        return {
            productionTeams: await getUsersListAction({
                "user.role": "Production",
            }),
            loaded: true,
        };
    }, []);
    const toast = useLoadingToast();
    const createAssignment = useAction(createSalesAssignmentAction, {
        onSuccess(args) {
            toast.display({
                title: "Assignment Created",
                duration: 2000,
            });
            revalidateTable();
        },
        onError(e) {
            toast.display({
                title: "Unable to complete",
                duration: 2000,
                variant: "destructive",
            });
        },
    });

    return (
        <DataSkeletonProvider value={{ loading: !data?.loaded } as any}>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit((e) => {
                        toast.display({
                            title: "Creating assignment",
                            duration: Number.POSITIVE_INFINITY,
                        });
                        createAssignment.execute(e);
                    })}
                >
                    <div className="mt-4 space-y-3 border border-border p-3 duration-300 animate-in fade-in-50 slide-in-from-top-5">
                        <h5 className="text-sm font-medium">
                            Create New Assignment
                        </h5>
                        <div className="grid grid-cols-2 items-end gap-4">
                            <FormSelect
                                size="sm"
                                options={data?.productionTeams || []}
                                label={"Assign To"}
                                name="assignedToId"
                                control={form.control}
                                placeholder="Select Production"
                                titleKey="name"
                                valueKey="id"
                            />

                            <DatePicker
                                control={form.control}
                                name="dueDate"
                                size="sm"
                                label="Due Date"
                            />
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
                            <SubmitButton
                                isSubmitting={createAssignment.isExecuting}
                                disabled={
                                    createAssignment.isExecuting ||
                                    !form.formState.isValid
                                }
                            >
                                Create Assignment
                            </SubmitButton>
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    // closeForm(e)
                                    console.log(form.formState.errors);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </DataSkeletonProvider>
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
                    {pendingQty || 0} available
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
