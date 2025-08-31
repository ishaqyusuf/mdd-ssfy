"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Accordion } from "@gnd/ui/accordion";
import { shippingCalculationFormSchema } from "@sales/shipping";
import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { FlatRateForm } from "./flat-rate-form";
import { WeightBasedForm } from "./weight-based-form";
import { PriceBasedForm } from "./price-based-form";
import { ZoneBasedForm } from "./zone-based-form";
import { PerItemForm } from "./per-item-form";
import { DimensionalWeightForm } from "./dimensional-weight-form";
import { useEffect } from "react";

export function ShippingCalculationForm() {
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.inventories.shipping.getShippingConfig.queryOptions(),
    );

    const form = useZodForm(shippingCalculationFormSchema, {
        defaultValues: data,
    });

    useEffect(() => {
        if (data) {
            form.reset(data);
        }
    }, [data, form]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Form {...form}>
            <Accordion type="multiple" className="space-y-6">
                <FlatRateForm form={form} />
                <WeightBasedForm form={form} />
                <PriceBasedForm form={form} />
                <ZoneBasedForm form={form} />
                <PerItemForm form={form} />
                <DimensionalWeightForm form={form} />
            </Accordion>
        </Form>
    );
}
