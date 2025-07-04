import { AsyncFnType } from "@/app/(clean-code)/type";
import { getSalesBookFormDataDta } from "../sales-form-dta";
import {
    DykeDoorType,
    DykeFormStepMeta,
    DykeStepProduct,
    HousePackageToolMeta,
    MultiSalesFormItem,
    SalesFormItem,
    SalesItemMeta,
    ShelfItemMeta,
    StepComponentMeta,
    StepMeta,
    TypedDykeSalesDoor,
} from "../../../types";
import { generateRandomString, inToFt, safeFormText, sum } from "@/lib/utils"; 
import { transformSalesStepMeta } from "./sales-step-dto";

type SalesFormData = AsyncFnType<typeof getSalesBookFormDataDta>;
type SalesFormItems = AsyncFnType<typeof typedSalesBookFormItems>;
export function transformSalesBookForm(data: SalesFormData) {
    const items = typedSalesBookFormItems(data);
    const deleteDoors = items.map((item) => item.deleteDoors).flat();

    const itemArray = transformSalesBookFormItem(data, items);
    const footer = {
        footerPrices: JSON.stringify(footerPrices),
        footerPricesJson: footerPrices,
    };
    let paidAmount = sum(data.order?.payments || [], "amount");
    return {
        order: data.order,
        deleteDoors,
        _rawData: { ...data.order, footer, formItem: itemArray },
        itemArray,
        paidAmount,
        footer,
        _refresher,
        batchSetting,
    };
}

export function typedSalesBookFormItems(data: SalesFormData) {
    return data.order.items.map((item) => {
        let _doorForm: {
            [dimension in string]: TypedDykeSalesDoor;
            // OrderType["items"][number]["housePackageTool"]["doors"][number];
        } = {};
        let _doorFormDefaultValue: {
            [dimension in string]: { id: number };
        } = {};
        // const isType = isComponentType(item.housePackageTool?.doorType as any);
        const deleteDoors = [];
        let stepUID = item.housePackageTool?.door?.stepProducts?.[0]?.uid;
        item.housePackageTool?.doors
            ?.filter((d) => !d.deletedAt)
            .map((d) => {
                // if (d.rhQty && !isType.multiHandles) d.rhQty = 0;
                let _dim = d.dimension?.replaceAll('"', "in");
                if (_dim?.includes("in")) _dim = inToFt(_dim);
                let dim = `${d.stepProduct?.uid || stepUID}-${_dim}`;

                // d.stepProduct?.uid;
                if (!d.priceId)
                    d.priceData = {
                        salesUnitCost: d.jambSizePrice,
                    } as any;
                if (_doorForm[dim]) {
                    deleteDoors.push(d.id);
                    return;
                }
                _doorForm[dim] = { ...d } as any;
                _doorFormDefaultValue[dim] = {
                    id: d.id,
                };
            });
        return {
            ...item,
            deleteDoors,
            housePackageTool: item.housePackageTool
                ? {
                      ...(item.housePackageTool || {}),
                      meta: (item?.housePackageTool?.meta ||
                          {}) as any as HousePackageToolMeta,
                      _doorForm,
                      _doorFormDefaultValue,
                      stepProduct: transformStepProduct(
                          item.housePackageTool.stepProduct,
                      ),
                  }
                : undefined,
            meta: item.meta as any as SalesItemMeta,
            formSteps: item.formSteps
                .map((item) => ({
                    ...item,
                    meta: item.meta as any as DykeFormStepMeta,
                    component: item.component
                        ? {
                              id: item.component.id,
                              meta: (item.component.meta ||
                                  {}) as any as StepComponentMeta,
                          }
                        : null,
                    step: {
                        ...item.step,
                        meta: (item.step.meta || {}) as any  &
                            StepMeta,
                    },
                }))
                .filter(
                    (f, fi) =>
                        item.formSteps.findIndex((p) => p.stepId == f.stepId) ==
                        fi,
                ),
            shelfItems: item.shelfItems.map((item) => ({
                ...item,
                meta: item.meta as any as ShelfItemMeta,
            })),
        };
    });
}
export function transformSalesBookFormItem(
    data: SalesFormData,
    items: SalesFormItems,
) {
    // console.log(items.length);

    const itemArray = (items || [null])
        .filter((item) => {
            if (item?.multiDykeUid) return item?.multiDyke;
            return true;
        })
        .map((item, itemIndex) => {
            const { formSteps, shelfItems, housePackageTool, ...itemData } =
                item || {};
            const shelfItemArray = transformShelfItem(item);
            const multiItem = transformMultiDykeItem(item, items, itemIndex);
            const _ = {
                opened: true,
                stepIndex: 0,
                multiComponent: multiItem.multiComponent,
                expanded: data.order.id ? false : true,
                stillChecked: true,
                sectionPrice: multiItem.sectionPrice,
                priceReferesher: null,
                formStepArray: formSteps.map(
                    ({ step, component, ...rest }) => ({
                        component,
                        step: transformSalesStepMeta(step),
                        item: rest,
                    }),
                ),
                item: {
                    ...itemData,
                    housePackageTool,
                    ...shelfItemArray,
                },
                uid: generateRandomString(4),
                stepSequence: getItemStepSequence(item, data),
            };
            return _;
        });

    return itemArray?.every((item) => item?.item?.meta?.lineIndex > -1)
        ? itemArray.sort(
              (item, item2) =>
                  item.item.meta.lineIndex - item2.item.meta.lineIndex,
          )
        : itemArray;
}
function getItemStepSequence(
    item: SalesFormItems[number],
    data: SalesFormData,
) {
    const stepSequence: {
        [uid in string]: StepComponentMeta["stepSequence"];
    } = {};
    item.formSteps.map((s, i) => {
        const seq = data.stepComponents.find((sq) => sq.uid == s.prodUid);
        if (seq?.meta?.stepSequence) {
            stepSequence[seq.uid] = seq.meta?.stepSequence;
        }
    });
}
const footerPrices: {
    [id in string]: {
        doorType: DykeDoorType;
        price: number;
        tax?: boolean;
    };
} = {};
const _refresher: {
    [token in string]: {
        components: string;
    };
} = {};
const batchSetting: {
    [token in string]: {
        selections: {
            [token in string]: boolean;
        };
    };
} = {};
export function transformShelfItem(item: SalesFormItems[number]) {
    const { shelfItems, ...itemData } = item;
    const shelfItemsData: SalesFormItem["shelfItems"] = {
        salesItemId: item?.id,
        subTotal: item.total,
        lines: {},
        lineUids: [],
    };
    const sorted = shelfItems.sort(
        (a, b) => a.meta.itemIndex - b.meta.itemIndex,
    );

    sorted.map((line) => {
        const siblings = sorted.filter(
            (a) => a.meta.lineUid == line.meta.lineUid,
        );
        if (line?.id == siblings?.[0]?.id) {
            shelfItemsData.lineUids.push(line.meta.lineUid);
            shelfItemsData.lines[line.meta.lineUid] = {
                categoryIds: line?.meta?.categoryUid
                    ?.split("-")
                    ?.map((a) => Number(a)),
                productUids: [],
                products: {},
            };
            const lineData = shelfItemsData.lines[line.meta.lineUid];
            siblings.map((product) => {
                const prodUid = generateRandomString();
                lineData.productUids.push(prodUid);
                lineData.products[prodUid] = {
                    basePrice: product.meta.basePrice,
                    categoryId: product.categoryId,
                    customPrice: product.meta.customPrice,
                    productId: product.productId,
                    qty: product.qty,
                    salesPrice: product.unitPrice,
                    totalPrice: product.totalPrice,
                    id: product.id,
                    title: product.description,
                };
            });
        }
    });
    return {
        shelfItemsData,
    };
}
export function transformMultiDykeItem(
    item: SalesFormItems[number],
    items: SalesFormItems,
    itemIndex,
) {
    const { formSteps, shelfItems, housePackageTool, ...itemData } = item;
    const multiComponent: MultiSalesFormItem = {
        components: {},
        uid: itemData.multiDykeUid as any,
        multiDyke: itemData.multiDyke as any,
    };
    let safeTitles: any = [];
    multiComponent.primary = ((multiComponent.uid &&
        multiComponent.multiDyke) ||
        (!multiComponent.multiDyke && multiComponent.uid)) as any;
    if (multiComponent.primary) multiComponent.rowIndex = itemIndex;
    const _comps = items.filter((item) => {
        if (item.id == itemData.id) {
            return true;
        }
        return item.multiDykeUid && itemData.multiDykeUid == item.multiDykeUid;
        if (item.multiDyke && item.id != itemData.id) return false;
        if (itemData.multiDykeUid == item.multiDykeUid) return true;
        return false;
    });

    let sectionPrice = 0;
    _comps.map((item) => {
        const component = item.housePackageTool?.doors?.length
            ? {
                  title: generateRandomString(4),
              }
            : item.housePackageTool?.door ||
                item.housePackageTool?.stepProduct?.uid
              ? {
                    title: item.housePackageTool?.stepProduct?.uid,
                }
              : {
                    title: generateRandomString(4),
                };

        const isMoulding = item.housePackageTool?.moldingId != null;

        let _dykeSizes: any = {}; //item.meta._dykeSizes;
        // if (!_dykeSizes) {
        //     _dykeSizes = {};
        //     item.housePackageTool?.doors?.map((door) => {
        //         const dim = door.dimension?.replaceAll('"', "in");
        //         _dykeSizes[dim] = {
        //             dim,
        //             dimFt: inToFt(door.dimension),
        //             width: inToFt(door.dimension.split(" x ")[0]),
        //             checked: true,
        //         };
        //     });
        // }
        if (component) {
            const uid = generateRandomString(4);
            function getMouldingId() {
                let mid = item.housePackageTool.moldingId;

                return mid;
            }
            const price = item?.housePackageTool?.totalPrice || item.total || 0;

            const safeTitle = safeFormText(component.title);
            let priceTags = item.housePackageTool?.meta?.priceTags;
            if (!priceTags) {
                priceTags = {};
                if (isMoulding) {
                    // console.log(item.rate);
                    priceTags = {
                        moulding: {
                            price: 0,
                            addon: item.rate,
                        },
                    };
                }
            }
            const cData = {
                uid,
                component,
                checked: true,
                heights: _dykeSizes,
                itemId: item.id,
                qty: item.qty,
                item,
                description: item.description as any,
                tax: item.meta.tax,
                production: itemData?.dykeProduction,
                doorQty: item.qty,
                unitPrice: item.rate,
                totalPrice: price,
                toolId: isMoulding
                    ? getMouldingId()
                    : item.housePackageTool?.dykeDoorId,
                _doorForm: item.housePackageTool?._doorForm || ({} as any),
                hptId: item.housePackageTool?.id as any,
                mouldingPriceData:
                    item?.housePackageTool?.priceData || ({} as any),
                doorTotalPrice: price,
                priceTags,
                stepProductId: item.housePackageTool?.stepProductId,
                stepProduct: item.housePackageTool?.stepProduct as any,
            };
            // if (multiComponent.components[safeTitle])
            //     throw new Error("Component already exists");
            multiComponent.components[safeTitle] = cData;
            safeTitles.push(safeTitle);

            footerPrices[uid] = {
                price: cData.totalPrice || 0,
                tax: cData.tax,
                doorType: item.meta.doorType,
            };
            sectionPrice += price;
        }
    });
    return {
        multiComponent,
        safeTitles,
        sectionPrice,
    };
}
export function transformStepProduct(stepProduct): DykeStepProduct | undefined {
    if (!stepProduct) return undefined;
    const result = stepProduct as DykeStepProduct;
    if (!result.meta)
        result.meta = {
            stepSequence: [],
            show: {},
        };
    const prodMeta = result.product?.meta || result.door?.meta;
    if (!result.product)
        result.product = {
            ...result.door,
            // value: result.door.title,
            // description: result.door.title,
        };
    result.metaData = {};
    return stepProduct;
}
