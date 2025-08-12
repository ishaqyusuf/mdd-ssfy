import { createContextFactory } from "@/utils/context-factory";
import { useInventoryForm } from "./form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray } from "react-hook-form";

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
    variantIndex: number;
}
export const {
    Provider: ProductVariantProvider,
    useContext: useProductVariant,
} = createContextFactory(({ variantIndex }: ProductVariantContextProps) => {
    const form = useInventoryForm();
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

