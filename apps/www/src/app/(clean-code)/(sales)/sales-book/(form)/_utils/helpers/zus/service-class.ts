import { generateRandomString } from "@/lib/utils";
import { ZusSales } from "../../../_common/_stores/form-data-store";
import { GroupFormClass } from "./group-form-class";
import { StepHelperClass } from "./step-component-class";

export class ServiceClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }

    public getServiceLineForm() {
        const services = this.getServices();
        const resp = {
            lines: services.map((m) => {
                // const priceModel = this.getCurrentComponentPricingModel(m.uid);
                return {
                    ...m,
                    // basePrice: priceModel?.pricing,
                };
            }),
        };
        return resp;
    }
    public addServiceLine() {
        const uid = generateRandomString(5);

        const itemForm = this.getItemForm();
        const itemsUids = itemForm.groupItem.itemIds;
        itemsUids.push(uid);
        this.dotUpdateItemForm("groupItem.itemIds", itemsUids);
        this.dotUpdateGroupItemForm(uid, {
            // addon: "",
            pricing: {
                addon: "",
                customPrice: "",

                totalPrice: 0,
            },
            meta: {
                description: "",
                produceable: false,
                taxxable: false,
                // noHandle: true,
            },
            qty: {
                total: "",
            },
            selected: true,
            swing: "",
        });
    }
    public getServices() {
        const itemForm = this.getItemForm();
        const uid = generateRandomString(5);
        let groupItem = itemForm.groupItem || {
            itemIds: [uid],
            form: {
                [uid]: {
                    pricing: {
                        addon: "",
                        customPrice: "",
                    },
                    meta: {
                        description: "",
                        produceable: false,
                        taxxable: false,
                    },
                    qty: {
                        total: "",
                    },
                    selected: true,
                    swing: "",
                },
            },
            itemType: "Services",
            qty: {
                total: 0,
            },
            pricing: {
                components: {
                    basePrice: 0,
                    salesPrice: 0,
                },
                total: {
                    basePrice: 0,
                    salesPrice: 0,
                },
            },
        };

        if (!itemForm.groupItem)
            this.dotUpdateItemForm("groupItem", groupItem as any);
        return groupItem.itemIds
            .map((itemUid) => {
                return {
                    itemUid,
                    selected: itemForm.groupItem?.form?.[itemUid]?.selected,
                };
            })
            ?.filter((s) => s.selected);
    }
}
