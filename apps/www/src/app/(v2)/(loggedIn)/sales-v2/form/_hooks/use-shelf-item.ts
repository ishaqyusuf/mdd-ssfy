import { useContext, useEffect, useState } from "react";
import { DykeShelfProducts } from "@/db";
import { generateRandomString } from "@/lib/utils";
import { useFieldArray, useForm } from "react-hook-form";

import { getShelfProducts } from "../_action/get-shelf-products.actions";
import { CategorizedShelfItem, IDykeShelfProducts } from "../../type";
import { DykeItemFormContext, useDykeForm } from "./form-context";
import useFooterEstimate from "./use-footer-estimate";

export default function useShelfItem(shelfIndex) {
    const form = useDykeForm();
    const item = useContext(DykeItemFormContext);
    const configky = `itemArray.${item.rowIndex}.item.shelfItemArray.${shelfIndex}`;
    const categoryForm = useForm<{
        ids: {
            id;
        }[];
    }>({
        defaultValues: {
            ids: [],
        },
    });
    const categoryProdsKey = `${configky}.productArray`;
    const prodArray = useFieldArray({
        control: form.control,
        name: categoryProdsKey as any,
        keyName: "_id",
    });
    const catArray = useFieldArray({
        control: categoryForm.control,
        name: "ids",
        keyName: "_id",
    });
    // prodArray.

    useEffect(() => {
        const oldf: CategorizedShelfItem = form.getValues(configky as any);

        const cids = (oldf?.categoryIds || [null])?.map((id) => ({ id }));

        catArray.replace(cids);
        const index = cids.length - 1;
        const lastId = cids.slice(-1)[0]?.id;

        if (lastId && index > -1) ctx.categorySelected(index, lastId);
    }, []);

    const [products, setProducts] = useState<
        DykeShelfProducts[] | undefined | null
    >(null);
    const footer = useFooterEstimate();
    const ctx = {
        categoryForm,
        catArray,
        prodArray,
        form,
        item,
        shelfItemKey: configky,
        productSelected(productId, prodIndex) {
            let prod = products?.find((p) => p.id == productId);
            if (prod) {
                const catIds = categoryForm.getValues("ids").map((i) => i.id);
                const lastId = catIds.slice(-1)[0];
                // console.log({
                //     catIds,
                //     lastId,
                // });
                const prodKey: any = `${configky}.productArray.${prodIndex}.item`;
                const uid =
                    form.getValues(`${configky}.uid` as any) ||
                    generateRandomString(4);
                form.setValue(`${configky}.uid` as any, uid);
                form.setValue(`${prodKey}.categoryId` as any, lastId);
                form.setValue(`${prodKey}.meta.categoryIds` as any, catIds);
                form.setValue(`${prodKey}.productId` as any, prod.id);
                form.setValue(`${prodKey}.unitPrice` as any, prod?.unitPrice);

                form.setValue(`${prodKey}.description` as any, prod?.title);
                // const qty = form.getValues(`${prodKey}.qty` as any);
                // if(!qty)
                // form.setValue
                // form.setValue()
                this.updateProductPrice(prodIndex, prod?.unitPrice);
            }
        },
        getProdFormKey(prodIndex, ...path) {
            let paths = path.map(
                (p) => `${configky}.productArray.${prodIndex}.item.${p}` as any,
            );
            if (path.length == 1) return paths[0];
            return paths;
        },
        updateProductPrice(prodIndex, unitPrice?, qty?) {
            const [qtyPath, unitPricePath, totalPath] = this.getProdFormKey(
                prodIndex,
                "qty",
                "unitPrice",
                "totalPrice",
            );
            if (!qty) qty = +form.getValues(qtyPath);

            if (!unitPrice) unitPrice = form.getValues(unitPricePath);
            if (!qty) {
                qty = 1;
            }
            form.setValue(qtyPath, qty);
            let totalPrice = (qty || 0) * (unitPrice || 0);

            form.setValue(unitPricePath, unitPrice);
            form.setValue(totalPath, totalPrice);

            footer.updateFooterPrice(form.getValues(`${configky}.uid` as any), {
                price: totalPrice,
                tax: true,
                doorType: "Shelf Items",
            });
        },
        watchProductEstimate(index) {
            return form.watch(
                this.getProdFormKey(index, "unitPrice", "totalPrice"),
            );
        },
        clearEstimates() {
            prodArray.fields.map((f, i) => {
                this.getProdFormKey(i, "unitPrice", "totalPrice").map((k) =>
                    form.setValue(k as any, null),
                );
            });
        },
        getParentCategoryId(index) {
            return index == 0 ? null : catArray.fields[0]?.id;
        },
        getCategoryId(index) {
            return index > 0 ? catArray.fields[index - 1]?.id : null;
        },
        shelfCategoryIds(index) {
            return {
                categoryId: this.getCategoryId(index),
                parentCategoryId: this.getParentCategoryId(index),
            };
        },
        getProdValue(index, key) {
            return form.getValues(this.getProdFormKey(index, key));
        },
        products,
        productUpdated(product: IDykeShelfProducts, prodIndex) {
            setProducts((current) => {
                const cIndex: any = current?.findIndex(
                    (p) => p.id == product.id,
                );
                const newData = [...((current || []) as any)];
                if (cIndex > -1) newData[cIndex] = product;
                else newData.push(product);
                if (prodIndex != null) {
                    const prodKey: any = `${configky}.productArray.${prodIndex}.item`;
                    form.setValue(
                        `${prodKey}.unitPrice` as any,
                        product?.unitPrice,
                    );
                    form.setValue(
                        `${prodKey}.description` as any,
                        product?.title,
                    );
                    // const qty = form.getValues(`${prodKey}.qty` as any);
                    // if(!qty)
                    // form.setValue
                    // form.setValue()
                    this.updateProductPrice(prodIndex, product?.unitPrice);
                }
                return newData;
            });
        },
        async categorySelected(index, categoryId) {
            let removeIndices: number[] = [];
            for (let i = index + 1; i < catArray.fields.length; i++)
                removeIndices.push(i);
            if (removeIndices.length) catArray.remove(removeIndices);
            setProducts(null);
            const parentCategoryId = this.getParentCategoryId(index);

            const { subCategoriesCount, products } = await getShelfProducts(
                parentCategoryId,
                categoryId,
            );
            if (subCategoriesCount) {
                catArray.append({ id: null });
            } else {
                setProducts(products);
            }
        },
    };
    return ctx;
}

interface CategoryForm {
    ids: { cid: number }[];
}
export type IUseShelfItem = ReturnType<typeof useShelfItem>;
// export type IUseShelfItem = Omit<
//     ReturnType<typeof useShelfItem>,
//     "prodArray"
// > & {
//     prodArray: UseFieldArrayReturn<DykeShelfItemForm>;
// };
// export interface IUseShelfItem {
//     products: DykeShelfProducts[] | undefined | null;
//     getProdFormKey(prodIndex, ...path: (keyof DykeShelfItemForm)[]): any;
//     updateProductPrice(prodIndex, unitPrice);
//     categorySelected(index, categoryId): Promise<any>;
//     getParentCategoryId(index): number | null | undefined;
//     getCategoryId(index): number | null | undefined;
//     shelfCategoryIds(index): {
//         categoryId: number | null | undefined;
//         parentCategoryId: number | null | undefined;
//     };
//     categoryForm: UseFormReturn<CategoryForm>;
//     catArray: UseFieldArrayReturn<CategoryForm>;
//     item: IDykeItemFormContext;
//     form: UseFormReturn<DykeForm>;
//     shelfItemKey: string;
//     productSelected(productId: number | undefined | null, prodIndex);
// }
