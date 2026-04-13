import { useZodForm } from "@/hooks/use-zod-form";
import { inventoryCategoryFormSchema } from "@sales/schema";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?;
}
export function FormContext({ children, data }: FormContextProps) {
    const { filters } = useInventoryFilterParams();
    const defaultValues = {
        categoryVariantAttributes: [],
        description: "",
        enablePricing: false,
        id: null,
        productKind: filters.productKind || "inventory",
        title: "",
        categoryIdSelector: null,
    };
    const form = useZodForm(inventoryCategoryFormSchema, {
        defaultValues,
    });
    useEffect(() => {
        form.reset({
            ...(data ?? defaultValues),
        });
    }, [data]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryCategoryForm = () =>
    useFormContext<z.infer<typeof inventoryCategoryFormSchema>>();
