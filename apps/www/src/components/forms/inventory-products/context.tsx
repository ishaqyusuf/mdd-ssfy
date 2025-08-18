import { createContextFactory } from "@/utils/context-factory";
import { useInventoryForm } from "./form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray } from "react-hook-form";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { parseAsString, useQueryStates } from "nuqs";
import { labelValueOptions, selectOptions } from "@gnd/utils";
import { useMemo, useState } from "react";
import { RouterOutputs } from "@api/trpc/routers/_app";

interface ProductContextProps {}
export const { Provider: ProductProvider, useContext: useProduct } =
    createContextFactory((props: ProductContextProps) => {
        const form = useInventoryForm();
        const trpc = useTRPC();
        const categoryId = form.watch("product.categoryId");
        const inventoryId = form.watch("product.id");
        const {
            data: attributeData,
            isPending,
            error,
        } = useQuery(
            trpc.inventories.getInventoryCategoryAttributes.queryOptions(
                { categoryId },
                {
                    enabled: !!categoryId,
                },
            ),
        );

        const { fields: variantFields } = useFieldArray({
            control: form.control,
            name: "variants",
            keyName: "_id",
        });
        const stockMonitor = form.watch("product.stockMonitor");
        const [status, isPriceEnabled] = form.watch([
            "product.status",
            "category.enablePricing",
        ]);
        const attributes = attributeData?.attributes;
        const noAttributes = !attributes?.length;
        return {
            variantFields,
            attributes,
            noAttributes,
            stockMonitor,
            inventoryId,
            isPriceEnabled,
            status,
        };
    });
interface ProductVariantContextProps {
    inventoryId: number;
}

export const {
    Provider: ProductVariantsProvider,
    useContext: useProductVariants,
} = createContextFactory(({ inventoryId }: ProductVariantContextProps) => {
    const trpc = useTRPC();
    const { data, error } = useQuery(
        trpc.inventories.inventoryVariantStockForm.queryOptions(
            {
                id: inventoryId,
            },
            {
                enabled: !!inventoryId,
            },
        ),
    );
    useDebugConsole("--->", { data, error });

    const [params, setParams] = useQueryStates(
        {
            v__q: parseAsString,
            ...Object.fromEntries(
                Object.keys(data?.filterParams || {}).map((k) => [
                    k,
                    parseAsString,
                ]),
            ),
        },
        {},
    );
    const filteredData = useMemo(() => {
        if (!data?.attributeMaps) return [];

        // normalize filters from params (ignore empty ones)
        const activeFilters = Object.fromEntries(
            Object.entries(params).filter(([key, value]) => Boolean(value)),
        );

        const list = data.attributeMaps.filter((item) => {
            // if no filters except q, default to active status
            const hasSearchFilters = Object.keys(activeFilters).length > 0;

            if (!hasSearchFilters && item.status !== "active") {
                return false;
            }

            // text search filter
            if (params.v__q) {
                const search = params.v__q.toLowerCase();
                if (!item.title.toLowerCase().includes(search)) {
                    return false;
                }
            }

            // attribute value filters
            for (const [key, value] of Object.entries(activeFilters)) {
                if (key === "v__q") continue; // skip search key

                const attrMatch = item.attributes.some(
                    (attr) =>
                        attr.attributeLabel.toLowerCase() ===
                            key.toLowerCase() &&
                        value.includes(attr.valueLabel),
                );
                if (!attrMatch) return false;
            }

            return true;
        });

        return list;
    }, [data, params]);
    const filterList = [
        {
            label: "Search",
            value: "v__q",
            type: "input",
        },
        ...Object.entries(data?.filterParams || {}).map(([k, v]) => ({
            value: k,
            type: "checkbox",
            options: labelValueOptions(v),
        })),
    ];
    return {
        data,
        inventoryId,
        filteredData,
        filter: {
            params,
            setParams,
            filterList,
        },
    };
});

interface VariantProviderProps {
    data: RouterOutputs["inventories"]["inventoryVariantStockForm"]["attributeMaps"][number];
}

export const { Provider: VariantProvider, useContext: useVariant } =
    createContextFactory(({ data }: VariantProviderProps) => {
        const [opened, setOpened] = useState(false);
        return {
            opened,
            setOpened,
            data,
        };
    });

