import { useZodForm } from "@/hooks/use-zod-form";
import { InventoryForm, inventoryFormSchema } from "@sales/schema";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?: InventoryForm;
}
export function FormContext({ children, data }: FormContextProps) {
    const defaultValues = {
        product: {
            id: null,
            categoryId: null,
            description: "",
            name: "",
            status: "draft",
            stockMonitor: false,
        },
        variants: [],
        images: [],
        subCategories: [],
    } satisfies InventoryForm;
    const form = useZodForm(inventoryFormSchema, {
        defaultValues,
    });
    useEffect(() => {
        if (data) {
            data.product.status = data.product.status || "draft";
            if (!data.product.description) data.product.description = "";
        }
        form.reset({
            ...(data ?? defaultValues),
        });
    }, [data]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryForm = () =>
    useFormContext<z.infer<typeof inventoryFormSchema>>();

