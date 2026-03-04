"use client";

import { useEffect } from "react";

import { SalesDispatchStatus } from "@/app-deps/(clean-code)/(sales)/types";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import FormSelect from "@/components/common/controls/form-select";
import { Form } from "@gnd/ui/form";
import { useDispatch } from "./context";
import { SubmitButton } from "@gnd/ui/submit-button";
import { Button } from "@gnd/ui/button";
import { useSalesCreateDispatch } from "@/hooks/use-create-sales-dispatch";
import { useZodForm } from "@/hooks/use-zod-form";
import { createDispatchSchema } from "@sales/schema";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function DispatchForm() {
    const ctx = useDispatch();
    const { setParams } = useSalesOverviewQuery();
    const form = useZodForm(createDispatchSchema, {
        defaultValues: {
            deliveryMode: "delivery",
            dueDate: new Date(),
            driverId: undefined,
            salesId: ctx.data?.id,
            status: "queue",
        },
    });
    // const { form } = useDispatch();
    // const [driverId]
    const { createDispatch, isCreating } = useSalesCreateDispatch({
        onSuccess(data) {
            setParams({
                salesTab: "packing",
                dispatchId: data.id,
            });
        },
    });

    const handleSubmit = (values: any) => {
        createDispatch(values);
    };
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <div className="grid grid-cols-2 items-end gap-4">
                    <DatePicker
                        // @ts-ignore
                        control={form.control}
                        name="dueDate"
                        size="sm"
                        label="Dispatch Date"
                    />
                    <FormSelect
                        size="sm"
                        options={ctx?.drivers || []}
                        label={"Assign To"}
                        name="driverId"
                        onSelect={(e) => {}}
                        // @ts-ignore
                        control={form.control}
                        placeholder="Select Driver"
                        titleKey="name"
                        valueKey="id"
                    />

                    <FormSelect
                        label="Dispatch Mode"
                        // @ts-ignore
                        control={form.control}
                        name="deliveryMode"
                        options={["pickup", "delivery"]}
                    />
                    <FormSelect
                        label="Dispatch Status"
                        // @ts-ignore
                        control={form.control}
                        name="status"
                        options={
                            [
                                "queue",
                                "in progress",
                                "completed",
                            ] as SalesDispatchStatus[]
                        }
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <Button
                        //    isSubmitting={ctx?.bachWorker?.executing}
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <SubmitButton isSubmitting={isCreating} type="submit">
                        Create Dispatch
                    </SubmitButton>
                </div>
            </form>
        </Form>
    );
}
