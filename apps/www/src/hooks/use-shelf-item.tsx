import React, {
    createContext,
    useContext,
    useDeferredValue,
    useMemo,
} from "react";
import { getShelfProductsAction } from "@/actions/cache/get-shelf-products";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { StepHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { generateRandomString } from "@/lib/utils";
import { FieldPath } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { ComboboxContent } from "@gnd/ui/combobox";

import { useShelf } from "./use-shelf";

export const ShelfItemContext = createContext<
    ReturnType<typeof useShelfItemContext>
>(null as any);
export const useShelfItem = () => useContext(ShelfItemContext);
export function useShelfItemContext({ shelfUid }) {
    const shelfCtx = useShelf();
    const zus = useFormDataStore();
    const shelfItemCtx = useShelfItem();
    const { categories, itemStepUid } = shelfCtx;
    const { shelf, cls } = useMemo(() => {
        const cls = new StepHelperClass(itemStepUid);
        const shelfItems = cls.getItemForm().shelfItems;
        return {
            cls,
            shelf: shelfItems.lines?.[shelfUid],
        };
    }, []);
    const options = useMemo(() => {
        if (shelf.categoryIds.length == 0)
            return categories?.filter((a) => a.type == "parent");
        const _catId = Number([...shelf.categoryIds].pop());
        const lastCat = categories?.find((a) => a.id == _catId);

        const options = categories?.filter((a) => a.categoryId == lastCat?.id);
        return options;
    }, [categories, shelf.categoryIds]);

    const [inputValue, setInputValue] = React.useState("");
    const deferredInputValue = useDeferredValue(inputValue);
    const filteredTricks = React.useMemo(() => {
        if (!deferredInputValue) return options;
        const normalized = deferredInputValue.toLowerCase();
        return options.filter((item) =>
            item.name.toLowerCase().includes(normalized),
        );
    }, [deferredInputValue, options]);

    const [content, setContent] = React.useState<React.ComponentRef<
        typeof ComboboxContent
    > | null>(null);
    const onInputValueChange = React.useCallback(
        (value: string) => {
            setInputValue(value);
            if (content) {
                (content as any).scrollTop = 0; // Reset scroll position
                //  virtualizer.measure();
            }
        },
        [content],
    );
    const [prodRefreshToken, setProductRefreshToken] = React.useState(null);
    const products = useAsyncMemo(async () => {
        const category = categories?.find(
            (c) => c.id == Number([...shelf.categoryIds].pop()),
        );
        let subCats = categories?.filter((c) => c.categoryId == category?.id);
        let cid = !subCats?.length && category ? [category.id] : null;
        if (!cid && subCats?.length && category) {
            //
            cid = [];
            function scrapeFinalCats(id) {
                let _subCats = categories?.filter((c) => c.categoryId == id);

                if (!_subCats?.length) cid.push(id);
                _subCats?.map((subCat) => {
                    scrapeFinalCats(subCat.id);
                });
            }
            scrapeFinalCats(category?.id);
        }

        const products = await getShelfProductsAction(cid);
        return products;
    }, [shelf.categoryIds, categories, prodRefreshToken]);
    const baseLinePath =
        `kvFormItem.${shelfCtx.itemUid}.shelfItems.lines.${shelfUid}` as const;
    function dotUpdateShelf(key: FieldPath<typeof shelf>, value) {
        zus.dotUpdate(`${baseLinePath}.${key}` as any, value);
    }
    function dotUpdateProduct(
        prodId,
        key: keyof (typeof shelf.products)[""],
        value,
    ) {
        if (value === undefined) value = null;
        zus.dotUpdate(
            `kvFormItem.${shelfCtx.itemUid}.shelfItems.lines.${shelfUid}.products.${prodId}.${key}`,
            value,
        );
    }
    // shelf.products

    return {
        refreshProds() {
            setProductRefreshToken(generateRandomString());
        },
        clearCategories() {
            dotUpdateShelf("categoryIds", []);
            dotUpdateShelf("productUids", []);
            dotUpdateShelf("products", {});
            shelfCtx.newProductLine(shelfUid);
        },
        filteredTricks,
        dotUpdateProduct,
        setContent,
        // prodUids: shelf.productUids,
        deferredInputValue,
        inputValue,
        options,
        ...shelf,
        setCategoryIds(ids) {
            cls.dotUpdateItemForm(
                `shelfItems.lines.${shelfUid}.categoryIds`,
                ids,
            );
        },
        productsList: products,
        onInputValueChange,
        addProduct() {
            const puid = generateRandomString();
            cls.dotUpdateItemForm(`shelfItems.lines.${shelfUid}.productUids`, [
                ...shelf.productUids,
                puid,
            ]);
            cls.dotUpdateItemForm(
                `shelfItems.lines.${shelfUid}.products.${puid}`,
                {} as any,
            );
        },
        clearProduct(prodUid) {
            cls.dotUpdateItemForm(
                `shelfItems.lines.${shelfUid}.products.${prodUid}`,
                {} as any,
            );
        },
        productChanged(prodUid, value) {
            if (!value) return;
            const productId = +value;
            const product = products.products.find(
                (prod) => prod.id == productId,
            );
            dotUpdateProduct(prodUid, "qty", 1);
            dotUpdateProduct(prodUid, "productId", product.id);
            dotUpdateProduct(prodUid, "categoryId", product.categoryId);
            dotUpdateProduct(prodUid, "basePrice", product.unitPrice);
            dotUpdateProduct(prodUid, "title", product.title);
            dotUpdateProduct(
                prodUid,
                "salesPrice",
                shelfCtx.costCls.calculateSales(product.unitPrice),
            );
            dotUpdateProduct(prodUid, "customPrice", null);
            if (!shelf.categoryIds?.length) {
                let cids = [];
                function getParentId(cid) {
                    cids.unshift(cid);
                    const c = categories?.find((s) => s.id == cid);

                    let pid = c?.categoryId;
                    if (pid) {
                        getParentId(pid);
                    }
                }
                getParentId(product.categoryId);
                dotUpdateShelf("categoryIds", cids);
            }
        },
        dotUpdateShelf,
        deleteProductLine(puid) {
            cls.dotUpdateItemForm(
                `shelfItems.lines.${shelfUid}.productUids`,
                [...shelf.productUids].filter((a) => a != puid),
            );
            const data = cls.dotGet(
                `kvFormItem.${shelfCtx.itemUid}.shelfItems.lines.${shelfUid}.products`,
            );
            if (data) delete data[puid];
            zus.dotUpdate(
                `kvFormItem.${shelfCtx.itemUid}.shelfItems.lines.${shelfUid}.products`,
                data,
            );
        },
    };
}
