import { useZodForm } from "@/hooks/use-zod-form";
import { inventoryCategoryFormSchema } from "@sales/schema";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?;
}
export function FormContext({ children, data }: FormContextProps) {
    const defaultValues = {
        categoryVariantAttributes: [],
        description: "",
        enablePricing: false,
        id: null,
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

