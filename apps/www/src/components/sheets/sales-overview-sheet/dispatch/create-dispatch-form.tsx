import { useZodForm } from "@/hooks/use-zod-form";
import { useSaleOverview } from "../context";

import { createDispatchSchema } from "@sales/schema";
import { Controller, useForm } from "react-hook-form";
import { DateField } from "@gnd/ui/controls-2/date-field";
import { SelectField } from "@gnd/ui/controls-2/select-field";
export function CreateDispatchForm() {
    const { data } = useSaleOverview();
    const salesId = data?.id;
    const form = useZodForm(createDispatchSchema, {
        defaultValues: {
            salesId,
            deliveryMode: "delivery",
            dueDate: new Date(),
            status: "queue",
            driverId: null,
        },
    });
    // const form = useForm({
    //     defaultValues: {},
    // });
    const handleSubmit = (values) => {};
    return (
        <div className="py-6">
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <div className="grid md:grid-cols-2 items-end gap-4">
                    <DateField
                        control={form.control}
                        name="dueDate"
                        label="Dispatch Date"
                    />
                    <SelectField
                        control={form.control}
                        name="deliveryMode"
                        label="Delivery Mode"
                        options={[
                            { label: "Delivery", value: "delivery" },
                            { label: "Pickup", value: "pickup" },
                        ]}
                    />
                </div>
            </form>
        </div>
    );
}

