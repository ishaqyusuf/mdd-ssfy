import { useInventoryParams } from "@/hooks/use-inventory-params";
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
        subComponents: [],
    } satisfies InventoryForm;
    const form = useZodForm(inventoryFormSchema, {
        defaultValues,
    });
    const { mode } = useInventoryParams();
    useEffect(() => {
        if (data) {
            data.product.status = data.product.status || "draft";
            if (!data.product.description) data.product.description = "";
        }
        form.reset({
            ...(data ?? defaultValues),
            mode,
        });
    }, [data, mode]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryForm = () =>
    useFormContext<z.infer<typeof inventoryFormSchema>>();

