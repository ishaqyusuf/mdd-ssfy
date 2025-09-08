import { dotObject, dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { PricingMetaData } from "@/app/(clean-code)/(sales)/types";
import { formatMoney } from "@/lib/use-number";
import { addPercentage, dotArray, percentageValue, sum } from "@/lib/utils";
import { toast } from "sonner";

import { ZusGroupItem } from "../../../_common/_stores/form-data-store";
import { SettingsClass } from "./settings-class";
import { laborRate } from "@/utils/sales-utils";

export class CostingClass {
    constructor(public setting?: SettingsClass) {}
    public get salesMultiplier() {
        return this.setting.dotGet("metaData.salesMultiplier") || 1;
    }
    public calculateSales(price) {
        if (!price) return price;

        const value = formatMoney(price * this.salesMultiplier);
        return value;
    }
    public calculateCost(sales) {
        return formatMoney(sales / this.salesMultiplier);
    }
    public salesProfileChanged() {
        const profile = this.setting.currentProfile();
        const multiplier = profile?.coefficient
            ? formatMoney(1 / profile.coefficient)
            : 1;
        this.setting.zus.dotUpdate("metaData.salesMultiplier", multiplier);
        // this.updateAllGroupedCost();
        Object.entries(this.setting.zus.kvFormItem).map(([itemUid, data]) => {
            this.updateComponentCost(itemUid, true);
        });
        // this.calculateTotalPrice();
        toast.success("Price updated");
    }

    public taxList() {
        return this.setting.dotGet("_taxForm.taxList");
    }
    public shelfItemCostUpdated(itemUid, salesPrice, productId) {
        const data = this.setting.zus;
        if (this.setting.staticZus) return;
        Object.entries(data.kvFormItem).map(([k, formData]) => {
            let subTotal = 0;
            const shelfItems = formData?.shelfItems;
            shelfItems?.lineUids?.map((uid) => {
                const line = shelfItems.lines?.[uid];
                line?.productUids?.map((puid) => {
                    const prod = line?.products?.[uid];
                    if (prod && prod.productId == productId) {
                        prod.salesPrice = salesPrice;
                        prod.totalPrice = formatMoney(
                            prod.salesPrice * prod.qty,
                        );
                        data?.dotUpdate(
                            `kvFormItem.${k}.shelfItems.lines.${uid}.products.${puid}`,
                            prod,
                        );
                    }
                    subTotal += Number(prod?.totalPrice || 0);
                });
                data?.dotUpdate(
                    `kvFormItem.${k}.shelfItems.subTotal`,
                    subTotal,
                );
            });
        });
        this.calculateTotalPrice();
    }
    public updateShelfCosts(
        itemUid = this.setting.itemUid,
        forceUpdate = false,
    ) {
        const data = this.setting.zus;
        if (this.setting.staticZus) return;
        const shelf = data.kvFormItem[itemUid]?.shelfItems;
        let subTotal = 0;
        shelf?.lineUids.map((uid) => {
            const line = shelf?.lines?.[uid];
            line?.productUids?.map((puid) => {
                let prod = line?.products?.[puid];
                if (!prod) return;
                // let oldTotal = prod.totalPrice;
                prod.salesPrice = this.calculateSales(prod.basePrice);
                prod.totalPrice = formatMoney(prod.salesPrice * prod.qty);
                data.dotUpdate(
                    `kvFormItem.${itemUid}.shelfItems.lines.${uid}.products.${puid}`,
                    prod,
                );
                subTotal += prod.totalPrice;
            });
        });
        data.dotUpdate(`kvFormItem.${itemUid}.shelfItems.subTotal`, subTotal);
        this.calculateTotalPrice();
    }
    public groupComponentCost(groupItem, itemUid) {
        const data = this.setting.zus;
        let totalBasePrice = 0;
        let totalFlatRate = 0;
        Object.entries(data.kvStepForm).map(([k, stepData]) => {
            if (k.startsWith(`${itemUid}-`)) {
                if (!stepData.flatRate)
                    totalBasePrice += stepData?.basePrice || 0;
                else totalFlatRate += stepData?.basePrice || 0;
            }
        });
        const ds = dotSet(groupItem);
        ds.set("pricing.components.basePrice", totalBasePrice);
        ds.set(
            "pricing.components.salesPrice",
            this.calculateSales(totalBasePrice),
        );
        ds.set("pricing.flatRate", totalFlatRate);
    }
    public updateComponentCost(
        itemUid = this.setting.itemUid,
        forceUpdate = false,
    ) {
        const data = this.setting.zus;
        // if (this.setting.staticZus) return;
        const itemForm = data.kvFormItem[itemUid];
        if (itemForm?.shelfItems?.lineUids) {
            this.updateShelfCosts(itemUid, forceUpdate);
            return;
        }
        let totalBasePrice = 0;
        let totalFlatRate = 0;

        Object.entries(data.kvStepForm).map(([k, stepData]) => {
            if (k.startsWith(`${itemUid}-`)) {
                if (!stepData.flatRate)
                    totalBasePrice += stepData?.basePrice || 0;
                else totalFlatRate += stepData?.basePrice || 0;
            }
        });
        const totalSalesPrice = this.calculateSales(totalBasePrice);

        const pricing = itemForm?.groupItem?.pricing;
        if (
            ((totalBasePrice ||
                pricing?.components?.basePrice ||
                totalFlatRate ||
                pricing?.flatRate) &&
                (pricing?.components?.basePrice != totalBasePrice ||
                    pricing?.flatRate != totalFlatRate)) ||
            forceUpdate
        ) {
            // update component price
            let groupItem = itemForm.groupItem;
            if (!groupItem)
                groupItem = {
                    itemType: this.setting.getItemType(),
                    form: {},
                    itemIds: [],
                    qty: {},
                    pricing: {
                        flatRate: totalFlatRate,
                        components: {
                            basePrice: totalBasePrice,
                            salesPrice: totalSalesPrice,
                        },
                        total: {},
                    },
                };
            else {
                const ds = dotSet(groupItem);
                ds.set("pricing.components.basePrice", totalBasePrice);
                ds.set("pricing.flatRate", totalFlatRate);
                ds.set("pricing.components.salesPrice", totalSalesPrice);
            }

            if (groupItem.form)
                Object.entries(groupItem.form || {}).map(([k, kform]) => {
                    // groupItem.pricing.flatRate
                    if (kform.pricing?.itemPrice)
                        kform.pricing.itemPrice.salesPrice =
                            this.calculateSales(
                                kform.pricing.itemPrice?.basePrice,
                            );
                });
            this.saveGroupItem(groupItem, itemUid);
            this.updateGroupedCost(itemUid);
            this.calculateTotalPrice();
        }
    }
    public updateGroupedCost(itemUid = this.setting.itemUid) {
        const data = this.setting.zus;

        const itemForm = data.kvFormItem[itemUid];
        let groupItem = itemForm.groupItem;
        if (!groupItem) return;
        if (!groupItem.pricing)
            groupItem.pricing = {
                flatRate: 0,
                components: {
                    basePrice: 0,
                    salesPrice: 0,
                },
                total: {
                    basePrice: 0,
                    salesPrice: 0,
                },
            };
        this.estimateGroupPricing(groupItem, itemUid);
    }
    public estimateGroupPricing(
        groupItem: ZusGroupItem,
        itemUid = this.setting.itemUid,
    ) {
        groupItem.pricing.total = {
            // flatRate: 0,
            basePrice: 0,
            salesPrice: 0,
        };
        this.groupComponentCost(groupItem, itemUid);
        let noHandle = this.setting.getRouteConfig(itemUid)?.noHandle;
        Object.entries(groupItem?.form).map(([uid, formData]) => {
            const handleSum = sum([formData.qty.lh, formData.qty.rh]);
            const qty = noHandle ? formData.qty?.total || handleSum : handleSum;
            if (noHandle) formData.qty.lh = formData.qty.rh = 0;
            formData.qty.total = qty;
            this.getEstimatePricing(groupItem, formData);
        });
        this.saveGroupItem(groupItem, itemUid);
    }
    public saveGroupItem(groupItem, itemUid) {
        const staticData = this.setting.staticZus;
        if (!staticData)
            this.setting.zus.dotUpdate(
                `kvFormItem.${itemUid}.groupItem`,
                groupItem,
            );
        else staticData.kvFormItem[itemUid].groupItem = groupItem;
    }
    public getEstimatePricing(gi, fd) {
        const zus = this.setting.zus;
        let groupItem: (typeof zus.kvFormItem)[number]["groupItem"] = gi;
        let formData: (typeof groupItem)["form"][number] = fd;
        const cPrice = formData.pricing?.customPrice as any;
        const customPricing = cPrice || (cPrice == 0 && cPrice !== "");
        const pll = [
            groupItem?.pricing?.components?.salesPrice,
            formData?.pricing?.itemPrice?.salesPrice,
            groupItem?.pricing?.flatRate,
        ];
        const pl = customPricing ? cPrice : sum(pll);

        const priceList = [pl, formData.pricing?.addon];
        const unitPrice = sum(priceList);
        const qty = Number(formData.qty.total);

        formData.pricing.laborQty = qty;

        const totalPrice = formatMoney(sum(priceList) * qty);
        formData.pricing.unitPrice = unitPrice;
        formData.pricing.totalPrice = totalPrice;

        if (formData.selected)
            groupItem.pricing.total.salesPrice += formData.pricing.totalPrice;
        return {
            unitPrice,
            totalPrice,
        };
    }
    public updateAllGroupedCost() {
        const data = this.setting.zus;
        Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
            this.updateGroupedCost(itemUid);
        });
        this.calculateTotalPrice();
    }
    public softCalculateTotalPrice(overrides: PricingMetaData = {}) {
        const data = this.setting.zus;

        const estimate = {
            ...data.metaData.pricing,
            ...overrides,
        };

        // const extraDiscount = data?.metaData?.extraCosts?.Discount?.amount;
        const extraDiscount = sum(
            data?.metaData?.extraCosts?.filter((a) => a.type == "Discount"),
            "amount",
        );
        const discount = extraDiscount || Number(estimate.discount) || 0;
        const taxxableDiscount = Math.min(discount, estimate.taxxable);
        const nonTaxxableDiscount =
            taxxableDiscount == estimate.taxxable &&
            discount != taxxableDiscount
                ? sum([discount, -1 * taxxableDiscount])
                : 0;
        let subTotalAfterDiscount = sum([estimate.subTotal, discount * -1]);

        let taxxable = sum([estimate.taxxable, -1 * taxxableDiscount]);
        const taxProfile = this.currentTaxProfile();
        estimate.taxValue = taxProfile
            ? percentageValue(taxxable, taxProfile.percentage)
            : 0;
        const subGrandTot = sum([subTotalAfterDiscount, estimate.taxValue]);

        const Labor = sum(
            Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
                return sum(
                    Object.entries(itemData?.groupItem?.form || {}).map(
                        ([k, d]) =>
                            sum([d?.pricing?.laborQty]) *
                            sum([
                                laborRate(
                                    data?.metaData?.salesLaborConfig?.rate,
                                    d?.pricing?.unitLabor,
                                ),
                            ]),
                    ),
                );
            }),
        );

        const extraCosts = sum(
            data.metaData.extraCosts
                ?.filter(
                    (a) =>
                        a.type != "CustomTaxxable" &&
                        a.type != "Discount" &&
                        a.type != "Labor",
                )
                .map((a) => a.amount),
        );
        if (data.metaData.paymentMethod == "Credit Card") {
            estimate.ccc = percentageValue(
                sum([subGrandTot, extraCosts, Labor]),
                3,
            );
        } else estimate.ccc = 0;
        estimate.grandTotal = formatMoney(
            sum([
                estimate.labour,
                estimate.delivery,
                Labor,
                extraCosts,
                subGrandTot,
                estimate.ccc || 0,
            ]),
        );
        const labor = this.getLaborCosts();
        if (labor.index > -1)
            if (this.setting?.staticZus) {
                this.setting.staticZus.metaData.pricing = estimate;
                this.setting.staticZus.metaData.extraCosts[labor.index].amount =
                    Labor;
            } else {
                this.setting.zus.dotUpdate("metaData.pricing", estimate);
                this.setting.zus.dotUpdate(
                    `metaData.extraCosts.${labor?.index}.amount`,
                    Labor,
                );
            }
    }
    public calculateTotalPrice() {
        const data = this.setting.zus;
        const estimate = {
            subTotal: 0,
            taxxable: 0,
        };
        Object.entries(data.kvFormItem).map(([itemUid, itemData]) => {
            const groupItem = itemData.groupItem;
            if (itemData.shelfItems) {
                const shelfSubTotal = Number(
                    itemData.shelfItems?.subTotal || 0,
                );
                estimate.subTotal += shelfSubTotal;
                estimate.taxxable += shelfSubTotal;
            } else
                Object.entries(groupItem?.form || {}).map(([uid, formData]) => {
                    if (!formData.selected) return;
                    const isService = groupItem.type == "SERVICE";
                    const price = Number(formData.pricing?.totalPrice || 0);
                    const taxxable =
                        !isService || (isService && formData.meta.taxxable);
                    estimate.subTotal += price;
                    if (taxxable) estimate.taxxable += price;
                });
        });
        this.softCalculateTotalPrice(estimate);
    }
    public currentTaxProfile() {
        return this.setting.zus.metaData?.tax;
    }
    public getLaborCosts() {
        const cost = this.setting.zus?.metaData?.extraCosts?.find(
            (a) => a.type == "Labor",
        );
        const index = this.setting.zus.metaData.extraCosts.indexOf(cost);
        return { cost, index };
    }
    public taxCodeChanged() {
        const taxProfile = this.taxList().find(
            (tax) => tax.taxCode == this.setting.dotGet("metaData.tax.taxCode"),
        );
        // this.setting?.zus.dotUpdate("metaData.tax.taxCode", taxProfile.taxCode);
        this.setting?.zus.dotUpdate("metaData.tax.title", taxProfile?.title);
        this.setting?.zus.dotUpdate(
            "metaData.tax.percentage",
            taxProfile?.percentage,
        );

        this.calculateTotalPrice();
    }
}
