"use client";
import createContextFactory from "@/lib/context-factory";
import { useTRPC } from "@/trpc/client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useProductFilterParams } from "./use-product-filter-params";
import { useDebugConsole } from "./use-debug-console";
import { useMemo, useState } from "react";
import { toast } from "@gnd/ui/use-toast";

interface Props {
  categorySlug;
  productSlug;
}
export const { Provider: ProductProvider, useContext: useProduct } =
  createContextFactory((props: Props) => {
    const [showSubComponentImage, setShowSubComponentImage] = useState(false);
    const trpc = useTRPC();
    const { filter, setFilter } = useProductFilterParams();
    const { data, error } = useSuspenseQuery(
      trpc.storefront.productOverview.queryOptions(
        {
          ...props,
        },
        {
          enabled: !!props.productSlug,
        }
      )
    );
    const { data: addonComponent } = useQuery(
      trpc.inventories.getStoreAddonComponentForm.queryOptions(
        {
          inventoryId: data?.product?.id,
        },
        {
          enabled: !!data?.product?.id,
        }
      )
    );
    const inventoryIds = [
      ...(addonComponent?.subComponentInventory?.subComponents?.map(
        (a) => a?.defaultInventoryId
      ) || []),
      ...Object.values(filter?.subComponent || {})?.map((a) => a?.inventoryId),
    ].filter(Boolean);
    const { data: componentsProducts } = useQuery(
      trpc.inventories.inventoryProducts.queryOptions(
        {
          ids: inventoryIds,
        },
        {
          enabled: !!inventoryIds?.length,
        }
      )
    );
    // const {filters,setFilters} = useProductFilterParams();
    // useDebugConsole({ data, error });
    const getMatchingVariant = (attributeId, valueId, variants) => {
      if (!variants?.attributeMaps) return null;

      const current = filter.variantId
        ? variants.attributeMaps.find((v) => v.variantId === filter.variantId)
        : variants.attributeMaps[0];

      if (!current) return;

      // swap out the chosen attribute
      const newAttrs = current.attributes.map((a) =>
        a.attributeId === attributeId ? { ...a, valueId } : a
      );

      // try exact match
      let match = variants.attributeMaps.find((v) =>
        newAttrs.every((na) =>
          v.attributes.some(
            (va) =>
              va.attributeId === na.attributeId && va.valueId === na.valueId
          )
        )
      );
      // fallback: best match (most matching attributes)
      // if (!match) {
      //   match = data.variants.attributeMaps
      //     .map((v) => ({
      //       v,
      //       score: v.attributes.filter((va) =>
      //         newAttrs.some(
      //           (na) =>
      //             na.attributeId === va.attributeId && na.valueId === va.valueId
      //         )
      //       ).length,
      //     }))
      //     .sort((a, b) => b.score - a.score)[0]?.v;
      // }
      return match;
    };
    const calculatedData = useMemo(() => {
      const variant =
        data?.variants?.attributeMaps?.find(
          (a) => a.variantId == filter.variantId
        ) || data?.variants?.attributeMaps?.[0];
      // collect all attributes with options
      const attributes: Record<
        number,
        {
          attributeId: number;
          attributeLabel: string;
          options: {
            valueId: number;
            valueLabel: string;
            variant?: typeof variant;
          }[];
        }
      > = {};
      data?.variants?.attributeMaps
        ?.filter((a) => {
          return a.status == "published";
        })
        .forEach((am) => {
          am.attributes.forEach((attr) => {
            if (!attributes[attr.attributeId]) {
              attributes[attr.attributeId] = {
                attributeId: attr.attributeId,
                attributeLabel: attr.attributeLabel,
                options: [],
              };
            }
            if (
              !attributes[attr.attributeId].options.some(
                (o) => o.valueId === attr.valueId
              )
            ) {
              attributes[attr.attributeId].options.push({
                valueId: attr.valueId,
                valueLabel: attr.valueLabel,
                variant: getMatchingVariant(
                  attr.attributeId,
                  attr.valueId,
                  data?.variants
                ),
              });
            }
          });
        });
      return {
        variant,
        attributes: Object.values(attributes),
      };
    }, [filter.variantId, data?.variants]);

    function selectAttribute(attributeId: number, valueId: number) {
      const match = getMatchingVariant(attributeId, valueId, data.variants);

      if (match) {
        if (match?.status == "published")
          setFilter({ variantId: match.variantId });
        else
          toast({
            title: "Not available",
          });
      }
    }

    return {
      ...(data || {}),
      ...calculatedData,
      selectAttribute,
      addonComponent,
      componentsProducts,
      inventoryIds,
      showSubComponentImage,
      setShowSubComponentImage,
    };
  });
