"use client";

import { useEffect } from "react";

import { SalesDispatchStatus } from "@/app-deps/(clean-code)/(sales)/types";
import { DatePicker } from "@/components/(clean-code)/custom/controlled/date-picker";
import FormSelect from "@/components/common/controls/form-select";

import { Form } from "@gnd/ui/form";

import { useDispatch } from "./context";
import { DispatchFormFooter } from "./dispatch-form-footer";

interface DispatchFormProps {
    dispatch?: any;
    onSubmit?: (values: any) => void;
    onCancel?: () => void;
}

export function DispatchForm({ dispatch, onSubmit }: DispatchFormProps) {
    const ctx = useDispatch();

    const { form } = useDispatch();

    useEffect(() => {
        if (ctx.data) {
            form.reset({
                delivery: {
                    deliveryMode: "delivery",
                    deliveryDate: new Date(),
                    status: "queue",
                },
                itemData: {
                    orderId: ctx.data.id,
                },
            });
        }
    }, [ctx.data]);

    return (
        <Form {...form}>
            <form
                // onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <div className="grid grid-cols-2 items-end gap-4">
                    <DatePicker
                        control={form.control}
                        name="delivery.deliveryDate"
                        size="sm"
                        label="Dispatch Date"
                    />
                    <FormSelect
                        size="sm"
                        options={ctx?.drivers || []}
                        label={"Assign To"}
                        name="delivery.driverId"
                        control={form.control}
                        placeholder="Select Driver"
                        titleKey="name"
                        valueKey="id"
                    />

                    <FormSelect
                        label="Dispatch Mode"
                        control={form.control}
                        name="delivery.deliveryMode"
                        options={["pickup", "delivery"]}
                    />
                    <FormSelect
                        label="Dispatch Status"
                        control={form.control}
                        name="delivery.status"
                        options={
                            [
                                "queue",
                                "in progress",
                                "completed",
                            ] as SalesDispatchStatus[]
                        }
                    />
                </div>
                <DispatchFormFooter />
            </form>
        </Form>
    );
}
