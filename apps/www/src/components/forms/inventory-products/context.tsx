import createContextFactory from "@/utils/context-factory";
import { useInventoryForm } from "./form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { useFieldArray } from "react-hook-form";
import { parseAsString, useQueryStates } from "nuqs";
import { selectOptions } from "@gnd/utils";
import { useEffect, useMemo } from "react";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useInventoryParams } from "@/hooks/use-inventory-params";

interface ProductContextProps {}
export const { Provider: ProductProvider, useContext: useProduct } =
    createContextFactory((props: ProductContextProps) => {
        const form = useInventoryForm();
        const trpc = useTRPC();
        const categoryId = form.watch("product.categoryId");
        const inventoryId = form.watch("product.id");
        const productKind = form.watch("product.productKind");
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
            productKind,
            isPriceEnabled,
            status,
            subComponentsArray,
            primaryStoreFront,
        };
    });
interface ProductVariantContextProps {
    inventoryId: number;
}

type VariantFilterOption = {
    label: string;
    value: string;
    sourceStepUid?: string | null;
    sourceComponentUid?: string | null;
};

export const {
    Provider: ProductVariantsProvider,
    useContext: useProductVariants,
} = createContextFactory(({ inventoryId }: ProductVariantContextProps) => {
    const trpc = useTRPC();
    const inventoryParams = useInventoryParams();
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
        _variantShow: parseAsString,
        ...Object.fromEntries(
            Object.keys(data?.filterParams || {}).map((k) => [
                k,
                parseAsString,
            ]),
        ),
    };
    const [params, setParams] = useQueryStates(paramsSchema, {});
    const showAllPricedOnly = !!data?.showAllPricedOnly;
    useEffect(() => {
        const cleared = Object.fromEntries(
            Object.keys(paramsSchema).map((key) => [key, null]),
        );

        return () => {
            setParams(cleared);
        };
    }, [inventoryId]);

    useEffect(() => {
        if (inventoryParams.productId) return;
        const cleared = Object.fromEntries(
            Object.keys(paramsSchema).map((key) => [key, null]),
        );
        setParams(cleared);
    }, [inventoryParams.productId]);

    const filterOptions = (data?.filterParams || {}) as Record<
        string,
        VariantFilterOption[]
    >;
    const widthFilterKey =
        Object.keys(filterOptions).find(
            (key) => key.trim().toLowerCase() === "width",
        ) || null;

    useEffect(() => {
        if (showAllPricedOnly) return;
        const nextParams: Record<string, string> = {};

        Object.entries(filterOptions).forEach(([key, options]) => {
            if (key === "_variantShow") return;
            if (params?.[key]) return;
            if (options.length !== 1) return;

            const onlyOption = options[0]?.value;
            if (!onlyOption) return;
            nextParams[key] = String(onlyOption);
        });

        if (!Object.keys(nextParams).length) return;
        setParams(nextParams);
    }, [filterOptions, params, setParams, showAllPricedOnly]);

    const selectedByStepUid = useMemo(() => {
        const selected = new Map<string, string>();
        Object.entries(params || {}).forEach(([key, value]) => {
            if (!value || key === "_variantShow") return;
            const option = (filterOptions[key] || []).find(
                (candidate) => String(candidate.value) === String(value),
            );
            if (!option?.sourceStepUid || !option?.sourceComponentUid) return;
            selected.set(option.sourceStepUid, option.sourceComponentUid);
        });
        return selected;
    }, [filterOptions, params]);

    const allowedDoorWidthValues = useMemo(() => {
        const variations = Array.isArray(data?.doorSizeVariation)
            ? data.doorSizeVariation
            : [];
        if (!variations.length || !widthFilterKey) return null;

        const hasRelevantSelections = variations.some((variation) =>
            (Array.isArray(variation?.rules) ? variation.rules : []).some(
                (rule) => selectedByStepUid.has(String(rule?.stepUid || "")),
            ),
        );

        const candidateVariations = hasRelevantSelections
            ? variations.filter((variation) => {
                  const rules = Array.isArray(variation?.rules)
                      ? variation.rules
                      : [];
                  return rules.every((rule) => {
                      const components = Array.isArray(rule?.componentsUid)
                          ? rule.componentsUid.map((value) =>
                                String(value || ""),
                            )
                          : [];
                      if (!components.length) return true;
                      const selected =
                          selectedByStepUid.get(String(rule?.stepUid || "")) ||
                          "";
                      if (!selected) return false;
                      return String(rule?.operator || "is") === "isNot"
                          ? components.every((value) => value !== selected)
                          : components.some((value) => value === selected);
                  });
              })
            : variations;

        const widths = new Set<string>();
        candidateVariations.forEach((variation) => {
            const widthList = Array.isArray(variation?.widthList)
                ? variation.widthList
                : [];
            widthList.forEach((width) => {
                const normalized = String(width || "").trim();
                if (normalized) widths.add(normalized);
            });
        });

        return widths;
    }, [data?.doorSizeVariation, selectedByStepUid, widthFilterKey]);

    useEffect(() => {
        if (!showAllPricedOnly) return;
        const cleared = Object.fromEntries(
            Object.keys(paramsSchema).map((key) => [key, null]),
        );
        setParams(cleared);
    }, [paramsSchema, setParams, showAllPricedOnly]);

    useEffect(() => {
        if (!widthFilterKey || !allowedDoorWidthValues) return;
        const selectedWidth = params?.[widthFilterKey];
        if (!selectedWidth) return;
        if (allowedDoorWidthValues.has(String(selectedWidth).trim())) return;
        setParams({
            [widthFilterKey]: null,
        });
    }, [allowedDoorWidthValues, params, setParams, widthFilterKey]);

    const { list: filteredData, hasSearchFilters } = useMemo(() => {
        if (showAllPricedOnly) {
            return {
                list: data?.attributeMaps || [],
                hasSearchFilters: false,
            };
        }
        const variantShow = params._variantShow || "priced";
        // normalize filters from params (ignore empty ones)
        const activeFilters = Object.fromEntries(
            Object.entries(params).filter(([key, value]) => Boolean(value)),
        );

        const hasSearchFilters =
            variantShow !== "priced" || Object.keys(activeFilters).length > 0;
        if (!data?.attributeMaps)
            return {
                list: [],
                activeFilters,
            };

        const list = data.attributeMaps.filter((item) => {
            const price = Number(item.price || 0);
            const hasPositivePrice = Number.isFinite(price) && price > 0;

            if (variantShow === "priced") {
                if (!hasPositivePrice) {
                    return false;
                }
            }
            if (
                !item?.attributes?.length &&
                !item?.variantId &&
                !hasPositivePrice &&
                item.status?.toLowerCase() !== "published"
            ) {
                return false;
            }

            if (allowedDoorWidthValues?.size) {
                const widthAttribute = item.attributes.find(
                    (attr) =>
                        attr.attributeLabel?.trim().toLowerCase() === "width",
                );
                if (
                    widthAttribute &&
                    !allowedDoorWidthValues.has(
                        String(widthAttribute.valueLabel || "").trim(),
                    )
                ) {
                    return false;
                }
            }

            // attribute value filters
            for (const [key, value] of Object.entries(activeFilters)) {
                if (key === "_variantShow") continue;

                const attrMatch = item.attributes.some(
                    (attr) =>
                        attr.attributeLabel.toLowerCase() ===
                            key.toLowerCase() &&
                        String(value) === String(attr.valueLabel),
                );
                if (!attrMatch) return false;
            }

            return true;
        });

        return { list, hasSearchFilters };
    }, [allowedDoorWidthValues, data, params, showAllPricedOnly]);
    const filterList = [
        {
            label: "Show",
            value: "_variantShow",
            type: "checkbox",
            options: [
                {
                    label: "Priced",
                    value: "priced",
                },
                {
                    label: "All",
                    value: "all",
                },
            ],
        },
        ...Object.entries(filterOptions).map(([k, v]) => ({
            value: k,
            type: "checkbox",
            options:
                widthFilterKey && k === widthFilterKey && allowedDoorWidthValues
                    ? v
                          .filter((option) =>
                              allowedDoorWidthValues.has(
                                  String(option.value || "").trim(),
                              ),
                          )
                          .map((option) => ({
                              label: option.label,
                              value: option.value,
                          }))
                    : v.map((option) => ({
                          label: option.label,
                          value: option.value,
                      })),
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
            filterList: showAllPricedOnly ? [] : filterList,
            paramsSchema,
        },
        showAllPricedOnly,
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
