import { useZodForm } from "@/hooks/use-zod-form";
import { inventoryFormSchema } from "@sales/schema";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?;
}
export function FormContext({ children, data }: FormContextProps) {
    const form = useZodForm(inventoryFormSchema, {
        defaultValues: {
            product: {
                id: undefined,
                categoryId: undefined,
                description: undefined,
                name: undefined,
                status: "draft",
                stockMonitor: false,
            },
            variants: [],
            images: [],
        },
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
                    id: undefined,
                },
                variants: [],
            }),
        });
    }, [data]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryForm = () =>
    useFormContext<z.infer<typeof inventoryFormSchema>>();

