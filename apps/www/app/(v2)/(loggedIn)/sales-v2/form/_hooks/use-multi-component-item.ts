import { useContext, useEffect, useState } from "react";
import { DykeItemFormContext, useDykeForm } from "./form-context";
import { camel, math, sum } from "@/lib/utils";
import { SizeForm } from "../components/modals/select-door-heights";
import { isComponentType } from "../../overview/is-component-type";
import getDoorConfig from "./use-door-config";
import useFooterEstimate from "./use-footer-estimate";

export type UseMultiComponentItem = ReturnType<typeof useMultiComponentItem>;
export type UseMultiComponentSizeRow = ReturnType<
    typeof useMultiComponentSizeRow
>;
export function useMultiComponentItem(componentTitle) {
    const form = useDykeForm();
    const item = useContext(DykeItemFormContext);
    const multiComponentComponentTitleKey = `itemArray.${item.rowIndex}.multiComponent.components.${componentTitle}`;
    const doorType = item.get.doorType();
    const isComponent = isComponentType(doorType);

    const isBifold = doorType == "Bifold";
    const isSlab = doorType == "Door Slabs Only";

    const prices =
        // isBifold || isSlab ? ["Door"] : ["Door", "Jamb Size", "Casing"]
        ["Door"].map((title) => ({
            title,
            key: camel(`${title} price`),
        }));
    const keys = {
        sumQty: `${multiComponentComponentTitleKey}.doorQty`,
        sumUnitPrice: `${multiComponentComponentTitleKey}.unitPrice`,
        sumTotal: `${multiComponentComponentTitleKey}.doorTotalPrice`,
        overridePrice: `${multiComponentComponentTitleKey}.priceTags.moulding.overridPrice`,
    };

    const [
        qty,
        unitPrice,
        totalPrice,
        doorTotalPrice,
        uid,
        tax,
        componentsTotal,
        mouldingPrice,
        addonPrice,
        overridePrice,
        calculatedPriceMode,
    ] = form.watch([
        `${multiComponentComponentTitleKey}.qty`,
        `${multiComponentComponentTitleKey}.unitPrice`,
        `${multiComponentComponentTitleKey}.totalPrice`,
        `${multiComponentComponentTitleKey}.doorTotalPrice`,
        `${multiComponentComponentTitleKey}.uid`,
        `${multiComponentComponentTitleKey}.tax`,
        `${multiComponentComponentTitleKey}.priceTags.components`,
        `${multiComponentComponentTitleKey}.priceTags.moulding.price`,
        `${multiComponentComponentTitleKey}.priceTags.moulding.addon`,
        keys.overridePrice,
        `order.meta.calculatedPriceMode`,
    ] as any);
    const footerEstimate = useFooterEstimate();
    useEffect(() => {
        const _totalPrice = math.multiply(qty, unitPrice);
        form.setValue(
            `${multiComponentComponentTitleKey}.unitPrice` as any,
            unitPrice
        );
        form.setValue(
            `${multiComponentComponentTitleKey}.totalPrice` as any,
            _totalPrice
        );
        const c = form.getValues(
            `itemArray.${item.rowIndex}.multiComponent.components`
        );
        let taxxable = 0;
        let total = 0;
        Object.entries(c).map(([title, data]) => {
            if (!data) return;
            const p =
                componentTitle == title ? _totalPrice : data.totalPrice || 0;
            taxxable += data.tax ? p : 0;
            total += p;
        });
        form.setValue(`itemArray.${item.rowIndex}.sectionPrice`, total);
        footerEstimate.updateFooterPrice(uid, {
            price: _totalPrice,
            doorType: item.get.doorType(),
            tax,
        });
    }, [qty, calculatedPriceMode, unitPrice, tax]);
    useEffect(() => {
        if (doorType != "Moulding") return;
        const _unitPrice = sum(
            calculatedPriceMode
                ? overridePrice
                    ? [overridePrice]
                    : [mouldingPrice, componentsTotal, addonPrice]
                : [addonPrice]
        );
        form.setValue(
            `${multiComponentComponentTitleKey}.unitPrice` as any,
            _unitPrice
        );
    }, [
        componentsTotal,
        mouldingPrice,
        calculatedPriceMode,
        overridePrice,
        addonPrice,
    ]);
    function calculateLineItem() {}

    const [sizeList, setSizeList] = useState<SizeForm[string][]>([]);
    function _setSizeList(heights: SizeForm) {
        const ls = Object.values(heights || {})
            .filter((i) => i.checked)
            ?.map((s) => {
                s.dim = s.dim?.replaceAll('"', "in");
                return s;
            }) as any;
        setSizeList(ls);
        setTimeout(() => {
            calculateSizeEstimate();
        }, 1500);
    }
    function initializeSizes() {
        const itemArray = item.get.itemArray();
        const current = itemArray.multiComponent.components?.[componentTitle];
        if (current) _setSizeList(current.heights);
    }

    function calculateSizeEstimate(dim?, qty?, _totalLinePrice?) {
        const itemData = item.get.itemArray();
        Object.entries(itemData.multiComponent.components).map(
            ([title, cData]) => {
                if (title == componentTitle) {
                    let totalDoors = 0;
                    let unitPrice = 0;
                    let totalPrice = 0;
                    Object.entries(cData._doorForm).map(
                        ([_size, _doorForm]) => {
                            // if (!cData.heights?.[_size]?.checked) return;
                            let _qty = sum([_doorForm.lhQty, _doorForm.rhQty]);
                            if (!_qty) return;
                            let _linePrice = _doorForm.lineTotal;

                            if (_size == dim) {
                                _qty = qty;
                                _linePrice = _totalLinePrice;
                            }
                            totalDoors += _qty || 0;
                            totalPrice += _linePrice || 0;
                        }
                    );

                    form.setValue(keys.sumTotal as any, totalPrice);
                    form.setValue(keys.sumQty as any, totalDoors);
                    footerEstimate.updateFooterPrice(cData.uid, {
                        price: totalPrice,
                        tax,
                        doorType: item.get.doorType(),
                    });
                    // updateFooterPrice(totalPrice);
                }
            }
        );
    }
    function removeLine(removeTab) {
        removeTab(componentTitle);
        console.log({ componentTitle });
        footerEstimate.lineItemDeleted(ctx);
        form.setValue(multiComponentComponentTitleKey as any, null);
    }

    const doorConfig = getDoorConfig(doorType);
    const ctx = {
        doorConfig,
        initializeSizes,
        removeLine,
        calculateSizeEstimate,
        componentTitle,
        form,
        item,
        prices,
        componentsTotal,
        isBifold,
        isSlab,
        sizeList,
        qty,
        multiComponentComponentTitleKey,
        isComponent,
        doorType,
        unitPrice,
        totalPrice,
        doorTotalPrice,
        mouldingPrice,
        calculatedPriceMode,
        addonPrice,
        _setSizeList,
        overridePrice,
        keys,
    };
    return ctx;
}

export function useMultiComponentSizeRow(
    componentItem: UseMultiComponentItem,
    size: SizeForm[string]
) {
    const { form, multiComponentComponentTitleKey, prices, item } =
        componentItem;
    const sizeRootKey = `${multiComponentComponentTitleKey}._doorForm.${size.dim}`;

    const keys = {
        lhQty: `${sizeRootKey}.lhQty`,
        rhQty: `${sizeRootKey}.rhQty`,
        unitPrice: `${sizeRootKey}.unitPrice`,
        lineTotal: `${sizeRootKey}.lineTotal`,
        doorPrice: `${sizeRootKey}.doorPrice`,
        // jambSizePrice: `${sizeRootKey}.jambSizePrice`,
        jambSizePrice: `${sizeRootKey}.jambSizePrice`,
        swing: `${sizeRootKey}.swing`,
        casingPrice: `${sizeRootKey}.casingPrice`,
        componentsTotal: `${multiComponentComponentTitleKey}.priceTags.components`,
        overridePrice: `${sizeRootKey}.meta.overridePrice`,
    };
    // prices.map(p => keys[])
    const [
        lhQty,
        rhQty,
        doorPrice,
        jambSizePrice,
        casingPrice,
        lineTotal,
        unitPrice,
        componentsTotal,
        calculatedPriceMode,
        overridePrice,
    ] = form.watch([
        keys.lhQty,
        keys.rhQty,
        keys.doorPrice,
        keys.jambSizePrice,
        keys.casingPrice,
        keys.lineTotal,
        keys.unitPrice,
        keys.componentsTotal,
        `order.meta.calculatedPriceMode`,
        keys.overridePrice,
    ] as any);

    useEffect(() => {
        const qty = sum([lhQty, rhQty]);

        const _unitPrice = sum(
            calculatedPriceMode
                ? overridePrice
                    ? [overridePrice]
                    : [jambSizePrice, componentsTotal, doorPrice]
                : [doorPrice]
        );

        const _totalLinePrice = math.multiply(qty, _unitPrice);
        form.setValue(`${keys.unitPrice}` as any, _unitPrice);
        form.setValue(`${keys.lineTotal}` as any, _totalLinePrice);
        componentItem.calculateSizeEstimate(size.dim, qty, _totalLinePrice);
    }, [
        lhQty,
        rhQty,
        doorPrice,
        jambSizePrice,
        casingPrice,
        componentsTotal,
        calculatedPriceMode,
        overridePrice,
    ]);
    return {
        sizeRootKey,
        keys,
        unitPrice,
        lineTotal,
        jambSizePrice,
        componentsTotal,
        calculatedPriceMode,
        overridePrice,
    };
}
