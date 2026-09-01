import { getCachedUsersList } from "@/actions/cache/get-cached-users-list";
import { createSalesAssignmentAction } from "@/actions/create-sales-assignment";
import { createAssignmentSchema } from "@/actions/schema";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import FormSelect from "@/components/common/controls/form-select";
import { SubmitButton } from "@/components/submit-button";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { timeout } from "@/lib/timeout";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalesFormQuantityStepper } from "@sales/sales-form";
import {
    createProductionDueDate,
    productionCalendarPartsFromLocalDate,
} from "@sales/production-date";
import { useAction } from "next-safe-action/hooks";
import { useController, useForm, useFormContext } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";
import z from "zod";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";

import { useProduction } from "./context";
import { useProductionItem } from "./production-item-context";

export function ProductionAssignmentForm({ closeForm }) {
    const ctx = useProductionItem();
    const { data: prodData } = useProduction();
    const { queryCtx, item } = ctx;
    const pending = item?.analytics?.assignment?.pending;
    const orderProdDueDate = prodData?.order?.prodDueDate
        ? new Date(prodData.order.prodDueDate)
        : null;
    const form = useForm<z.infer<typeof createAssignmentSchema>>({
        resolver: zodResolver(createAssignmentSchema),
        defaultValues: {
            unitLabor: item.unitLabor,
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
            assignedToId: null,
            dueDate: orderProdDueDate,
            salesItemId: item?.itemId,
            salesDoorId: item.doorId,
            salesId: item.salesId,
            itemUid: item.controlUid,
            itemsTotal: item.qty.qty,
        },
    });
    const formData = form.watch();
    const data = useAsyncMemo(async () => {
        await timeout(100);
        return {
            productionTeams: await getCachedUsersList({
                "user.role": "Production",
            }),
            loaded: true,
        };
    }, []);
    const toast = useLoadingToast();
    const createAssignment = useAction(createSalesAssignmentAction, {
        onSuccess(args) {
            toast.success("Assignment Created");
            queryCtx.salesQuery.assignmentUpdated();

            closeForm();
        },
        onError() {
            toast.error("Unable to complete!");
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
                        createAssignment.execute({
                            ...e,
                            dueDate: e.dueDate
                                ? createProductionDueDate(
                                      productionCalendarPartsFromLocalDate(
                                          e.dueDate,
                                      ),
                                  )
                                : null,
                        });
                    })}
                >
                    <div className="mt-4 flex flex-col gap-3 border border-border p-3 duration-300 animate-in fade-in-50 slide-in-from-top-5">
                        <h5 className="text-sm font-medium">
                            Create New Assignment
                        </h5>
                        <FieldGroup className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                            <Field>
                                <FormSelect
                                    className="mx-0"
                                    size="sm"
                                    options={data?.productionTeams || []}
                                    label={"Assign To"}
                                    name="assignedToId"
                                    control={form.control}
                                    placeholder="Select Production"
                                    titleKey="name"
                                    valueKey="id"
                                />
                            </Field>

                            <Field>
                                <DatePicker
                                    control={form.control}
                                    name="dueDate"
                                    size="sm"
                                    label="Due Date"
                                />
                            </Field>
                            {formData?.pending?.lh || formData?.pending?.rh ? (
                                <>
                                    <QtyInput name="lh" />
                                    <QtyInput name="rh" />
                                </>
                            ) : (
                                <>
                                    <QtyInput name="qty" />
                                    <div className="hidden sm:block" />
                                </>
                            )}
                            <Field>
                                <SubmitButton
                                    isSubmitting={createAssignment.isExecuting}
                                    disabled={
                                        createAssignment.isExecuting ||
                                        !form.formState.isValid
                                    }
                                >
                                    Create Assignment
                                </SubmitButton>
                            </Field>
                            <Field>
                                <Button type="button" variant="outline" onClick={closeForm}>
                                    Cancel
                                </Button>
                            </Field>
                        </FieldGroup>
                    </div>
                </form>
            </Form>
        </DataSkeletonProvider>
    );
}
function QtyInput({ name }: { name: "lh" | "rh" | "qty" }) {
    const { control, getValues, setValue } =
        useFormContext<z.infer<typeof createAssignmentSchema>>();
    const fieldName = `qty.${name}` as const;
    const pendingQty = Number(getValues(`pending.${name}`) || 0);
    const {
        field: { value },
    } = useController({
        name: fieldName,
        control,
    });
    const label = name === "qty" ? "Quantity" : `${name.toUpperCase()} quantity`;

    return (
        <Field>
            <FieldLabel className="flex justify-between uppercase">
                <span>{label}</span>
                <span className="text-muted-foreground">
                    {pendingQty || 0} available
                </span>
            </FieldLabel>
            <SalesFormQuantityStepper
                label={label}
                value={value}
                min={0}
                max={pendingQty}
                disabled={!pendingQty}
                className="w-full"
                onChange={(nextValue) => {
                    setValue(fieldName, nextValue, {
                        shouldDirty: true,
                        shouldValidate: true,
                    });
                }}
            />
        </Field>
    );
}
