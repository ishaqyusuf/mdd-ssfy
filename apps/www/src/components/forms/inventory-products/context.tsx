import createContextFactory from "@/utils/context-factory";
import { useInventoryForm } from "./form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray } from "react-hook-form";
import { parseAsString, useQueryStates } from "nuqs";
import { labelValueOptions, selectOptions } from "@gnd/utils";
import { useMemo, useState } from "react";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useInventoryParams } from "@/hooks/use-inventory-params";

interface ProductContextProps {}
export const { Provider: ProductProvider, useContext: useProduct } =
    createContextFactory((props: ProductContextProps) => {
        const form = useInventoryForm();
        const trpc = useTRPC();
        const categoryId = form.watch("product.categoryId");
        const inventoryId = form.watch("product.id");
        const primaryStoreFront = form.watch("product.primaryStoreFront");

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
        const subComponentsArray = useFieldArray({
            control: form.control,
            name: "subComponents",
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
            categoryId,
            isPriceEnabled,
            status,
            subComponentsArray,
            primaryStoreFront,
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
    const paramsSchema = {
        _qVariant: parseAsString,
        ...Object.fromEntries(
            Object.keys(data?.filterParams || {}).map((k) => [
                k,
                parseAsString,
            ]),
        ),
    };
    const [params, setParams] = useQueryStates(paramsSchema, {});
    const { list: filteredData, hasSearchFilters } = useMemo(() => {
        // normalize filters from params (ignore empty ones)
        const activeFilters = Object.fromEntries(
            Object.entries(params).filter(([key, value]) => Boolean(value)),
        );

        const hasSearchFilters = Object.keys(activeFilters).length > 0;
        if (!data?.attributeMaps)
            return {
                list: [],
                activeFilters,
            };

        const list = data.attributeMaps.filter((item) => {
            // if no filters except q, default to active status
            if (!hasSearchFilters) {
                if (
                    !item?.attributes?.length ||
                    item.status?.toLowerCase() === "published"
                )
                    return true;
                return false;
            }

            // text search filter
            if (params._qVariant) {
                const search = params._qVariant.toLowerCase();
                if (!item.title.toLowerCase().includes(search)) {
                    return false;
                }
            }

            // attribute value filters
            for (const [key, value] of Object.entries(activeFilters)) {
                if (key === "_qVariant") continue; // skip search key

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

        return { list, hasSearchFilters };
    }, [data, params]);
    const filterList = [
        {
            label: "Search",
            value: "_qVariant",
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
        hasSearchFilters,
        unfilteredList: data?.attributeMaps || [],
        filter: {
            params,
            setParams,
            filterList,
            paramsSchema,
        },
    };
});

interface VariantProviderProps {
    data: RouterOutputs["inventories"]["inventoryVariantStockForm"]["attributeMaps"][number];
}

export const { Provider: VariantProvider, useContext: useVariant } =
    createContextFactory(({ data }: VariantProviderProps) => {
        // const [opened, setOpened] = useState(false);
        const { setParams, editVariantTab, editVariantUid } =
            useInventoryParams();
        const opened = data?.uid == editVariantUid;
        return {
            opened,
            data,
        };
    });

