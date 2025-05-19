import { Prisma } from "@/db";

import {
    DykeFormStepMeta,
    DykeSalesDoorMeta,
    HousePackageToolMeta,
    SalesFormFields,
    SalesItemMeta,
    ShelfItemMeta,
} from "../../../types";
import {
    HptData,
    SaverData,
    SaveSalesClass,
    ShelfData,
} from "./save-sales-class";

export class ItemHelperClass {
    constructor(
        public ctx: SaveSalesClass,
        public formItemId,
    ) {}
    public itemData: SaverData["items"][number];
    public formItem(old = false) {
        const fitem = this.workspace(old)?.kvFormItem[this.formItemId];

        return fitem;
    }

    public workspace(old = false) {
        return old ? this.ctx.oldFormState : this.ctx.form;
    }
    public getLineIndex(old = false) {
        return (
            this.workspace(old).sequence?.formItem?.indexOf(this.formItemId) + 1
        );
    }
    public groupItemForm(old = false) {
        return this.formItem(old)?.groupItem?.form;
    }
    public formSteps(old = false) {
        const ws = this.workspace(old);
        const stepSequence = ws.sequence?.stepComponent?.[this.formItemId];

        return stepSequence?.map((s) => ws.kvStepForm[s]);
    }
    public generateDoorsItem() {
        const formItem = this.formItem();
        const lineIndex = this.getLineIndex();
        const form = this.groupItemForm();
        const formList = Object.values(form);

        // const salesItemId = formList?.find((s) => s.meta?.salesItemId)?.meta
        // ?.salesItemId;
        const salesItemId = formItem?.id;

        const meta = {
            doorType: formItem.groupItem.itemType,
            lineIndex,
        } satisfies SalesItemMeta;

        const updateData = {
            meta,
            dykeDescription: formItem?.title,
            qty: null,
        } satisfies Prisma.SalesOrderItemsUpdateInput;
        if (!salesItemId) {
            const { ...rest } = updateData;
            const createData = {
                ...rest,
                salesOrderId: this.ctx.salesId,
                id: this.ctx.nextId("itemId"),
            } satisfies Prisma.SalesOrderItemsCreateManyInput;
            this.itemData = {
                data: createData,
                id: createData.id,
                formValues: [],
            };
        } else {
            this.itemData = {
                id: salesItemId,
                formValues: [],
                data: {
                    ...updateData,
                },
            };
        }
        this.generateItemFormSteps();

        const itemHtp: HptData = {
            id: formItem.groupItem?.hptId,
            doors: [],
        };
        const hptId = itemHtp?.id || this.ctx.nextId("hpt");
        let stepProductId;
        const hptMeta = {} satisfies HousePackageToolMeta;

        Array.from(new Set(Object.keys(form).map((k) => k.split("-")[0]))).map(
            (stepUid) => {
                Object.entries(form)
                    .filter(
                        ([uid, formData]) =>
                            uid.startsWith(stepUid) && formData.selected,
                    )
                    .map(([stepSizeUid, formData]) => {
                        // console.log(formData);
                        if (!stepProductId) {
                            stepProductId =
                                formData.stepProductId?.id ||
                                formData.stepProductId?.fallbackId;
                        }
                        const [_, ...dimensions] = stepSizeUid?.split("-");
                        const dimension = dimensions?.join("-");

                        const doorData: HptData["doors"][number] = {
                            id: formData.doorId,
                        };
                        const updateDoor = this.composeSalesDoorUpdateData(
                            formData,
                            dimension,
                            formData.stepProductId?.id ||
                                formData.stepProductId.fallbackId,
                        );
                        // console.log(updateDoor);

                        if (formData.doorId) {
                            if (
                                this.validateSalesDoorUpdate(
                                    formData.doorId,
                                    updateDoor,
                                    stepSizeUid,
                                    dimension,
                                )
                            )
                                doorData.data = updateDoor;
                        } else {
                            const { stepProduct, ...rest } = updateDoor;

                            const createDoor = {
                                ...rest,
                                id: this.ctx.nextId("salesDoor"),
                                housePackageToolId: hptId,
                                salesOrderId: this.ctx.salesId,
                                salesOrderItemId: this.itemData.id,
                                stepProductId: formData.stepProductId.id,
                            } satisfies Prisma.DykeSalesDoorsCreateManyInput;
                            doorData.data = createDoor;
                            doorData.id = createDoor.id;
                        }

                        itemHtp.doors.push(doorData);
                    });
                this.itemData.hpt = itemHtp;
            },
        );
        const updateHpt = {
            meta: hptMeta,
            stepProduct: {
                connect: {
                    id: stepProductId,
                },
            },
        } satisfies Prisma.HousePackageToolsUpdateInput;

        if (itemHtp.id) {
            itemHtp.data = updateHpt;
            //  itemHtp.id = hpt.id;
        } else {
            const { stepProduct, ...createHtp } = updateHpt;
            const hpt = {
                id: hptId,
                ...createHtp,
                orderItemId: this.itemData.id,
                salesOrderId: this.ctx.salesId,
                doorType: formItem.groupItem.itemType,
                stepProductId: formItem.groupItem.doorStepProductId,
            } satisfies Prisma.HousePackageToolsCreateManyInput;
            itemHtp.data = hpt;
            itemHtp.id = hpt.id;
        }

        if (this.itemData.hpt?.doors?.length)
            this.ctx.data.items.push(this.itemData);
    }
    public generateItemFormSteps() {
        const steps = this.formSteps();
        steps.map((step) => {
            const updateData = this.composeStepUpdateData(step);
            if (!step.stepFormId) {
                const { salesOrderItem, component, ...rest } = updateData;
                const createData = {
                    ...rest,
                    componentId: component?.connect?.id,

                    id: this.ctx.nextId("formStep"),
                    stepId: step.stepId,
                    salesId: this.ctx.salesId,
                    salesItemId: this.itemData.id,
                } satisfies Prisma.DykeStepFormCreateManyInput;

                this.itemData.formValues.push({
                    data: createData,
                    id: createData.id,
                });
            } else {
                this.itemData.formValues.push(
                    this.validateFormValueUpdate(step.stepFormId, updateData),
                );
            }
        });
    }
    public composeStepUpdateData(step) {
        const meta = {
            flatRate: step.flatRate,
        } satisfies DykeFormStepMeta;
        return {
            basePrice: this.ctx.safeInt(step.basePrice),
            price: this.ctx.safeInt(step.salesPrice),
            prodUid: step.componentUid,
            component: step.componentId
                ? {
                      connect: {
                          id: step.componentId,
                      },
                  }
                : undefined,
            // componentId: step.componentId,
            qty: 1,
            meta,
            value: step.value,
            salesOrderItem: {
                connect: {
                    id: this.itemData.id,
                },
            },
        } satisfies Prisma.DykeStepFormUpdateInput;
    }
    public composeSalesDoorUpdateData(formData, dimension, fid = null) {
        return {
            dimension,
            lhQty: this.ctx.safeInt(formData.qty.lh),
            rhQty: this.ctx.safeInt(formData.qty.rh),
            totalQty: this.ctx.safeInt(formData.qty.total),
            jambSizePrice: this.ctx.safeInt(
                formData.pricing.itemPrice.salesPrice,
            ),
            doorPrice: this.ctx.safeInt(formData.pricing.addon),
            meta: {
                overridePrice: formData.pricing.customPrice,
                laborQty: formData?.pricing?.laborQty,
                unitLabor: formData?.pricing?.unitLabor,
                prodOverride: formData?.prodOverride,
            } satisfies DykeSalesDoorMeta,
            unitPrice: this.ctx.safeInt(formData.pricing.unitPrice),
            lineTotal: this.ctx.safeInt(formData.pricing.totalPrice),
            swing: formData.swing,
            stepProduct: {
                connect: {
                    id: fid || formData.stepProductId.id,
                },
            },
        } satisfies Prisma.DykeSalesDoorsUpdateInput;
    }
    public validateSalesDoorUpdate(
        id,
        data: Prisma.DykeSalesDoorsUpdateInput,
        formUid,
        dimension,
    ) {
        if (this.ctx.isRestoreMode) return true;
        const group = this.groupItemForm(true);
        const formData = group?.[formUid];
        if (formData) {
            const updateDoor = this.composeSalesDoorUpdateData(
                formData,
                dimension,
            );

            return this.ctx.compare(data, updateDoor) ? false : true;
        }
        return true;
    }

    public validateFormValueUpdate(id, data: Prisma.DykeStepFormUpdateInput) {
        const _: any = { id };
        const fss = this.formSteps(true);
        const formStep = fss?.find((s) => s.stepFormId == id);

        if (formStep && !this.ctx.isRestoreMode) {
            const updateData = this.composeStepUpdateData(formStep);
            updateData.salesOrderItem.connect.id = formStep.salesOrderItemId;
            if (this.ctx.compare(data, updateData)) {
                return _;
            }
        }
        _.data = data;
        return _;
    }
    public generateShelfItems() {
        const {
            shelfItems: { lineUids, lines, subTotal },
        } = this.formItem();
        let itemIndex = 0;
        const shelfs: ShelfData = [];
        lineUids.map((uid) => {
            const { categoryIds, productUids, products } = lines[uid];
            productUids.map((puid) => {
                const prod = products[puid];
                const meta = {
                    itemIndex: ++itemIndex,
                    categoryUid: categoryIds.join("-"),
                    customPrice: prod.customPrice,
                    laborQty: prod?.laborQty,
                    unitLabor: prod?.unitLabor,
                    basePrice: prod.basePrice,
                    lineUid: uid,
                } as ShelfItemMeta;
                const updateShelf = {
                    category: {
                        connect: {
                            id: prod.categoryId,
                        },
                    },
                    totalPrice: prod.totalPrice,
                    unitPrice: prod.salesPrice,
                    qty: prod.qty,
                    description: prod.title,
                    shelfProduct: {
                        connect: {
                            id: prod.productId,
                        },
                    },
                    salesOrderItem: {
                        connect: {
                            id: this.itemData.id,
                        },
                    },
                    meta: meta as any,
                } satisfies Prisma.DykeSalesShelfItemUpdateInput;
                const prodId = prod.id || this.ctx.nextId("shelfItemId");
                if (prod.id) {
                    shelfs.push({
                        data: updateShelf,
                        id: prod.id,
                    });
                } else {
                    const { category, shelfProduct, salesOrderItem, ...rest } =
                        updateShelf;
                    shelfs.push({
                        id: prodId,
                        data: {
                            ...rest,
                            id: prodId,
                            categoryId: category.connect.id,
                            productId: shelfProduct.connect.id,
                            salesOrderItemId: this.itemData.id,
                        } satisfies Prisma.DykeSalesShelfItemCreateManyInput,
                    });
                }
            });
        });
        this.itemData.shelfItems = shelfs;
    }
    public generateNonDoorItem(
        gf?: SalesFormFields["kvFormItem"][""]["groupItem"]["form"][""],
        primaryGroupItem?,
    ) {
        if (!gf) gf = {} as any;
        const lineIndex = this.getLineIndex();
        const formItem = this.formItem();
        // formItem.groupItem.id
        // formItem?.id
        const isMoulding = formItem?.groupItem?.type == "MOULDING";
        const shelf = formItem?.shelfItems;
        const isShelf = shelf?.lineUids?.length;
        const salesItemId = isShelf
            ? formItem?.shelfItems?.salesItemId
            : gf?.meta?.salesItemId;
        const meta = {
            doorType: formItem?.groupItem?.itemType,
            lineIndex,
            ...(isMoulding || isShelf
                ? {}
                : {
                      tax: gf?.meta?.taxxable,
                  }),
        } satisfies SalesItemMeta;
        const updateData = {
            meta,
            ...(isMoulding || isShelf
                ? {}
                : {
                      dykeProduction: gf.meta?.produceable || false,
                  }),
            rate: this.ctx.safeInt(gf?.pricing?.unitPrice),
            total: isShelf
                ? this.ctx.safeInt(shelf.subTotal)
                : this.ctx.safeInt(gf?.pricing?.totalPrice),
            description: gf?.meta?.description,
            swing: gf.swing,
            qty: this.ctx.safeInt(gf.qty?.total),
            multiDykeUid: isShelf ? null : formItem?.groupItem?.groupUid,
            multiDyke: primaryGroupItem,
            dykeDescription: formItem?.title,
            // salesOrder
        } satisfies Prisma.SalesOrderItemsUpdateInput;
        const { multiDykeUid, multiDyke, ...rest } = updateData;
        if (!salesItemId) {
            const createData = {
                ...updateData,
                salesOrderId: this.ctx.salesId,
                id: this.ctx.nextId("itemId"),
            } satisfies Prisma.SalesOrderItemsCreateManyInput;
            this.itemData = {
                data: createData,
                id: createData.id,
                formValues: [],
            };
        } else {
            this.itemData = {
                data: updateData,
                id: salesItemId,
                formValues: [],
            };
        }
        if (primaryGroupItem || isShelf) this.generateItemFormSteps();
        if (isShelf) this.generateShelfItems();
        if (isMoulding) {
            const itemHtp: HptData = {
                id: gf.hptId,
            };
            const hptMeta = {
                priceTags: {
                    moulding: {
                        addon: this.ctx.safeInt(gf.pricing?.addon),
                        overridePrice: gf.pricing?.customPrice as any,
                        salesPrice: this.ctx.safeInt(
                            gf?.pricing?.itemPrice?.salesPrice,
                        ),
                        basePrice: this.ctx.safeInt(
                            gf?.pricing?.itemPrice?.basePrice,
                        ),
                        price: this.ctx.safeInt(gf?.pricing?.unitPrice),
                        laborQty: gf.pricing?.laborQty,
                        unitLabor: gf.pricing?.unitLabor,
                    },
                },
            } satisfies HousePackageToolMeta;
            const updateHpt = {
                meta: hptMeta,
                stepProduct: {
                    connect: {
                        id: gf.stepProductId?.id,
                    },
                },
                // molding: {
                //     connect: {
                //         id: gf.stepProductId?.id,
                //     },
                // },
            } satisfies Prisma.HousePackageToolsUpdateInput;
            if (itemHtp.id) {
                itemHtp.data = updateHpt;
            } else {
                const { stepProduct, ...createHtp } = updateHpt;
                const hpt = {
                    id: this.ctx.nextId("hpt"),
                    ...createHtp,
                    orderItemId: this.itemData.id,
                    salesOrderId: this.ctx.salesId,
                    doorType: formItem.groupItem.itemType,
                    stepProductId: gf.stepProductId.id,
                    moldingId: gf.mouldingProductId,
                } satisfies Prisma.HousePackageToolsCreateManyInput;
                itemHtp.data = hpt;
                itemHtp.id = hpt.id;
            }
            this.itemData.hpt = itemHtp;
        }
        //  if (this.itemData.hpt?.doors)
        this.ctx.data.items.push(this.itemData);
    }
}
