import { createContextFactory } from "@/utils/context-factory";
import { useInventoryProductForm } from "./form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray } from "react-hook-form";

interface ProductContextProps {}
export const { Provider: ProductProvider, useContext: useProduct } =
    createContextFactory((props: ProductContextProps) => {
        const form = useInventoryProductForm();
        const trpc = useTRPC();
        const categoryId = form.watch("product.categoryId");
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

        const attributes = attributeData?.attributes;
        const noAttributes = !attributes?.length;
        return {
            variantFields,
            attributes,
            noAttributes,
            stockMonitor,
        };
    });
interface ProductVariantContextProps {
    variantIndex: number;
}
export const {
    Provider: ProductVariantProvider,
    useContext: useProductVariant,
} = createContextFactory(({ variantIndex }: ProductVariantContextProps) => {
    const form = useInventoryProductForm();
    const trpc = useTRPC();
    const productCtx = useProduct();
    const addAttribute = () => {
        addAttributeField({
            attributeId: undefined,
            attributeInventoryId: undefined,
            id: undefined,
        });
    };
    const {
        fields: attributeFields,
        remove: removeAttribute,
        append: addAttributeField,
    } = useFieldArray({
        control: form.control,
        name: `variants.${variantIndex}.attributes`,
        keyName: "_id",
    });

    return { variantIndex, attributeFields, removeAttribute, addAttribute };
});

