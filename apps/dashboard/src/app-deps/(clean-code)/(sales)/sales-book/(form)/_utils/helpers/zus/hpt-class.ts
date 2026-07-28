import { formatMoney } from "@/lib/use-number";

import { GroupFormClass } from "./group-form-class";
import { ComponentHelperClass } from "./step-component-class";
type SizeForm = ReturnType<
    HptClass["getHptForm"]
>["doors"][number]["sizeList"][number];
export class HptClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public getDoorStepForm() {
        return Object.entries(this.zus.kvStepForm).filter(
            ([uid, data]) =>
                uid.startsWith(`${this.itemUid}-`) && data.title == "Door",
        )?.[0]?.[1];
    }
    public tabChanged(value) {
        this.dotUpdateItemForm("groupItem._.tabUid", value);
    }
    public getHptForm() {
        const doors = this.getSelectedDoors();

        const config = this.getRouteConfig();
        const itemForm = this.getItemForm();

        const resp = {
            doors: doors.map((door) => {
                const priceModel = this.getDoorPriceModel(door.uid);
                return {
                    ...door,
                    cls: new ComponentHelperClass(this.stepUid, door.uid),
                    sizeList: priceModel.heightSizeList?.map((hsl) => {
                        const path = `${door.uid}-${hsl.size}`;
                        const selected = this.isDoorSelected(path);
                        const basePrice =
                            priceModel.formData?.priceVariants?.[hsl.size]
                                ?.price;
                        return {
                            path,
                            title: hsl.size,
                            basePrice,
                            salesPrice: this.calculateSales(basePrice),
                            selected,
                        };
                    }),
                };
            }),
            config,
            pricedSteps: this.getPricedSteps(),
            // tabUid: itemForm.groupItem?._?.tabUid,
        };

        // if (resp.doors.every((s) => s.uid != resp.tabUid)) {
        //     resp.tabUid = resp.doors?.[0]?.uid;
        //     this.dotUpdateItemForm("groupItem._.tabUid", resp.tabUid);
        // }

        return resp;
    }
    public getStepProductUid() {
        return this.getItemForm()?.groupItem?.doorStepProductId;
    }
    public get tabUid() {
        return this.getItemForm()?.groupItem?._?.tabUid;
    }
    public getSelectedDoors() {
        const itemForm = this.getItemForm();
        const doorStep = this.getDoorStepForm();

        const selectionComponentUids = Array.from(
            new Set(itemForm.groupItem?.itemIds?.map((s) => s.split("-")[0])),
        );
        return selectionComponentUids
            .map((componentUid) => {
                const component = this.getComponentFromSettingsByStepId(
                    doorStep?.stepId,
                    componentUid,
                );
                return component;
            })
            .filter(Boolean);
    }

    public isDoorSelected(uid) {
        return this.getItemForm()?.groupItem?.form?.[uid]?.selected;
    }
    public getComponentPrice() {
        const itemForm = this.getItemForm();
        return itemForm?.groupItem?.pricing?.components?.salesPrice;
    }

    public addHeight(size: SizeForm) {
        const path = size.path;
        const config = this.getRouteConfig();
        if (this.getGroupItemForm(path)) {
            this.dotUpdateGroupItemFormPath(path, "selected", true);
            this.dotUpdateGroupItemFormPath(path, "qty.lh", "");
            this.dotUpdateGroupItemFormPath(path, "qty.rh", "");
            this.dotUpdateGroupItemFormPath(path, "qty.total", "");
        } else {
            const componentPrice = this.getComponentPrice();
            const salesPrice = size.salesPrice; //this.calculateSales(size.basePrice?.price);
            const estimatedComponentPrice = formatMoney(
                salesPrice + componentPrice,
            );
            this.dotUpdateGroupItemForm(path, {
                qty: {
                    lh: "",
                    rh: "",
                    total: "",
                },
                selected: true,
                swing: "",
                stepProductId: this.getStepProductUid(),
                pricing: {
                    addon: "",
                    itemPrice: {
                        basePrice: size.basePrice,
                        salesPrice,
                    },
                    customPrice: "",
                    componentPrice,
                    totalPrice: 0,
                    unitPrice: formatMoney(estimatedComponentPrice),
                },
                meta: {
                    description: "",
                    produceable: true,
                    taxxable: true,
                    // noHandle: config?.noHandle,
                },
            });
        }
    }
}
