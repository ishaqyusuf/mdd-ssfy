import { useZodForm } from "@/hooks/use-zod-form";
import { inventoryProductFormSchema } from "@sales/schema";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?;
}
export function FormContext({ children, data }: FormContextProps) {
    const form = useZodForm(inventoryProductFormSchema, {
        defaultValues: {},
    });
    useEffect(() => {
        form.reset({
            ...(data ?? {
                product: {
                    categoryId: undefined,
                    description: undefined,
                    name: undefined,
                    status: "draft",
                    stockMonitor: false,
                },
                variants: [
                    {
                        attributes: [],
                        name: "",
                        sku: "",
                    },
                ],
            }),
        });
    }, [data]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryProductForm = () =>
    useFormContext<z.infer<typeof inventoryProductFormSchema>>();

