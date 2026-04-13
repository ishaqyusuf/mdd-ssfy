import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { InventoryForm, inventoryFormSchema } from "@gnd/inventory/schema";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

interface FormContextProps {
    children?;
    data?: InventoryForm;
}
export function FormContext({ children, data }: FormContextProps) {
    const pathname = usePathname();
    const defaultValues = {
        product: {
            id: null,
            categoryId: null,
            description: "",
            name: "",
            productKind: "inventory",
            status: "draft",
            stockMonitor: false,
            primaryStoreFront: false,
        },
        variants: [],
        images: [],
        suppliers: [],
        supplierVariants: [],
        subCategories: [],
        subComponents: [],
    } satisfies InventoryForm;
    const form = useZodForm(inventoryFormSchema, {
        defaultValues,
    });
    const { mode, defaultValues: paramDefaultValues } = useInventoryParams();
    const routeDefaultKind =
        pathname?.startsWith("/inventory/components") ? "component" : "inventory";
    useEffect(() => {
        if (data) {
            data.product.status = data.product.status || "draft";
            if (!data.product.description) data.product.description = "";
        }
        form.reset({
            ...defaultValues,
            product: {
                ...defaultValues.product,
                productKind: routeDefaultKind,
            },
            ...(paramDefaultValues || {}),
            ...(data ?? defaultValues),
            mode,
        });
    }, [data, mode, paramDefaultValues, pathname]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useInventoryForm = () =>
    useFormContext<z.infer<typeof inventoryFormSchema>>();
