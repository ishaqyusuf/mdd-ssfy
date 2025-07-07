import { generateRandomString } from "@/lib/utils";
import { DykeForm } from "../type";
import { isComponentType } from "../overview/is-component-type";
import { deepCopy } from "@/lib/deep-copy";
import { calculateSalesEstimate } from "./calculate-sales-estimate";
import { HousePackageToolMeta } from "@/types/sales";

export default function initDykeSaving(data: DykeForm, noEstimate = false) {
    const errorData: any = {};
    data = {
        ...data,
        itemArray: data.itemArray.map((_, index) => {
            const _item = { ..._ };
            if (_item.item.meta) _item.item.meta = {} as any;
            const t = _item.item.formStepArray?.[0]?.item?.value;
            _item.item.meta.doorType = t as any;
            if (_item.item.meta.doorType != "Shelf Items")
                _item.item.shelfItemArray = [];
            if (!_item.item?.meta) _item.item.meta = {} as any;
            _item.item.meta.lineIndex = index;
            return {
                ..._item,
            };
        }),
    };
    if (!data.order.paymentTerm && data._rawData?.paymentTerm)
        data.order.paymentTerm = data._rawData?.paymentTerm;

    errorData.errorId = data.order.slug || generateRandomString(5);
    const init = initializeMultiComponent(data);
    // console.log(data.itemArray.length);
    // if (noEstimate) return data;
    errorData.init = init;
    const e = calculateSalesEstimate(init);
    // errorData.calculated = e;
    return e;
}
function initializeMultiComponent(data: DykeForm) {
    let allItems: DykeForm["itemArray"] = [];
    let trash = {
        orderItems: [] as any,
        housePackageTools: [] as any,
        doorForms: [] as any,
    };
    data.itemArray.map((item, index) => {
        let items: DykeForm["itemArray"] = [];
        // if (!item?.multiComponent?.components) {
        if (item.item.shelfItemArray.length) {
            allItems.push(item);
            return;
        }
        // }
        const components = Object.values(
            item?.multiComponent?.components || {}
        ).filter(Boolean);
        let parented =
            components.find(
                (c: any) => c.checked && c.itemId && c.itemId == item.item.id
            ) != null;
        components.map((c) => {
            if (!c.checked) {
                trash.orderItems.push(c.itemId);
                trash.housePackageTools.push(c.hptId);
                return;
            }
            const type = isComponentType(item.item?.meta?.doorType);

            let clone: DykeForm["itemArray"][0] = deepCopy(item);
            clone.item.multiDyke = false;
            if ((c.itemId && c.itemId == item.item.id) || !parented) {
                clone.item.multiDyke = true;
                parented = true;
            } else {
                clone.item.formStepArray = [];
            }
            clone.item.multiDykeUid = item.multiComponent.uid as any;
            if (clone.item.housePackageTool)
                clone.item.housePackageTool.id = c.hptId as any;
            clone.item.id = c.itemId as any;

            if (type.garage) clone.item.swing = c.swing as any;
            if (type.service) {
                clone.item.meta.tax = c.tax || false;
                clone.item.dykeProduction = c.production || false;
            } else {
                clone.item.meta.tax = true;
            }
            if (
                !type.moulding &&
                !type.service &&
                clone.item.housePackageTool
            ) {
                if (!clone.item.multiDyke) {
                    clone.item.formStepArray = [];
                }
                Object.keys(c._doorForm || {}).map((k) => {
                    const df = c._doorForm?.[k];
                    // !c.heights?.[k]?.checked && df
                    if (df?.id && !df?.lhQty && !df?.rhQty) {
                        trash.doorForms.push(df.id);
                        delete c._doorForm?.[k];
                    }
                });
                clone.item.housePackageTool._doorForm = c._doorForm;
                clone.item.housePackageTool.totalDoors = c.doorQty;
                clone.item.housePackageTool.priceData =
                    c.mouldingPriceData as any;
                clone.item.housePackageTool.priceId = c.mouldingPriceData?.id;
                let {
                    createdAt,
                    deletedAt,
                    orderItemId,
                    updatedAt,
                    totalDoors,
                    dykeDoorId,
                    moldingId,
                    ...rest
                } = clone.item.housePackageTool || {};

                if (clone.item.meta.doorType == "Moulding")
                    moldingId = c.toolId;
                else dykeDoorId = c.toolId;
                // c.priceTags.components =
                // item.item.housePackageTool?.meta?.priceTags?.components;
                // console.log(c.priceTags);

                clone.item.housePackageTool = {
                    ...rest,
                    dykeDoorId,
                    moldingId,
                    // priceData:
                    meta: {
                        priceTags: c.priceTags,
                    } as HousePackageToolMeta,
                } as any;
                const filterItems = () => {
                    const {
                        createdAt,
                        deletedAt,
                        updatedAt,
                        // meta,
                        ...rest
                    } = clone.item;
                    return {
                        ...(rest as any),
                    };
                };
                clone.item = filterItems();
                clone.item.qty = 1;
                clone.item.rate =
                    clone.item.price =
                    clone.item.total =
                        c.doorTotalPrice;
            } else {
                clone.item.price = clone.item.rate = c.unitPrice;
                clone.item.total = c.totalPrice;

                clone.item.qty = c.qty;
                clone.item.description = c.description as any;

                if (clone.item.housePackageTool) {
                    clone.item.housePackageTool.stepProductId = c.stepProductId;

                    if (type.moulding) {
                        // console.log(c.priceTags);
                        clone.item.housePackageTool.meta.priceTags =
                            c.priceTags;
                        clone.item.housePackageTool.dykeDoorId = null;
                        clone.item.housePackageTool.moldingId = c.toolId;
                    } else {
                        clone.item.housePackageTool.moldingId = null;
                        clone.item.housePackageTool.dykeDoorId =
                            c.stepProduct?.doorId;
                    }
                }
            }

            items.push(clone);
        });
        if (items.length == 1 && items?.[0]?.item) {
            items[0].item.multiDyke = false;
            items[0].item.multiDykeUid = null;
        }
        allItems.push(...items);
    });
    data.itemArray = allItems;
    return data;
}
