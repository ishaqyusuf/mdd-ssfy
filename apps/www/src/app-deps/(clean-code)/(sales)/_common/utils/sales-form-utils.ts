import { ComponentPrice } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { generateRandomString, sum } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";

import { DykeFormData } from "../../types";

// import { profileUpdateStepCtx } from "../../sales-book/(form)/_utils/helpers/step-helper";
type DykeFormReturn = UseFormReturn<DykeFormData>;
function salesProfileChanged(form: DykeFormReturn, id) {
    const data = form.getValues();
    const profile = data.data.profiles.find((p) => p.id == id);
    form.setValue("order.paymentTerm", profile?.meta?.net || ("None" as any));
    form.setValue("order.goodUntil", profile?.goodUntil);
    // return;
    setTimeout(() => {
        data.itemArray.map((item, index) => {
            item.item.formStepArray.map((formStep, formStepIndex) => {
                let basePrice = formStep.item.basePrice || 0;
                let price = salesProfileCost(form, basePrice);
                form.setValue(
                    `itemArray.${index}.formStepArray.${formStepIndex}.item.price` as any,
                    price,
                );
            });
            // return;
            Object.entries(item?.multiComponent?.components || {}).map(
                ([k, v]) => {
                    const componentKey = `itemArray.${index}.multiComponent.components.${k}`;
                    if (v.priceTags?.moulding?.basePrice) {
                        const bPrice = v.priceTags.moulding.basePrice;
                        const price = salesProfileCost(form, bPrice);

                        form.setValue(
                            `${componentKey}.priceTags.moulding.price` as any,
                            price,
                        );
                    }
                    if (v._doorForm) {
                        Object.entries(v._doorForm).map(([size, doorForm]) => {
                            // const price = salesProfileCost(
                            //     form,
                            //     doorForm.jambSizePrice
                            // );
                            const sizeKey = `${componentKey}._doorForm.${size}`;
                            const priceData = ctx.componentPrice.update(
                                form,
                                doorForm.priceData,
                                ctx.baseProfileCost(
                                    form,
                                    doorForm.priceData || {},
                                ),
                            );

                            // if (size == `1-6 x 6-8`) {

                            // }
                            // if (sum([doorForm.lhQty, doorForm.rhQty]))

                            form.setValue(
                                `${sizeKey}.priceData` as any,
                                priceData,
                            );

                            form.setValue(
                                `${sizeKey}.jambSizePrice` as any,
                                priceData.salesUnitCost,
                            );
                        });
                    }
                },
            );
            form.setValue(
                `itemArray.${index}.priceRefresher`,
                generateRandomString(),
            );
        });
        // profileUpdateStepCtx.applyUpdates();
        // data.itemArray?.map(item => )
    }, 500);
}

function salesProfileCost(form: DykeFormReturn, baseCost) {
    if (!baseCost) return null;
    const data = form.getValues();

    const profile = data.data.profiles.find(
        (p) => p.id == data.order.customerProfileId,
    );
    if (!profile || profile.coefficient == 0) return baseCost;
    return formatMoney(baseCost / (profile.coefficient || 1));
}
function baseProfileCost(
    form: DykeFormReturn,
    { baseUnitCost, salesUnitCost }: Partial<ComponentPrice>,
) {
    if (!salesUnitCost || baseUnitCost) return baseUnitCost;
    const data = form.getValues();

    const profile = data.data.profiles.find(
        (p) => p.id == data.order.customerProfileId,
    );
    if (!profile || profile.coefficient == 0) return salesUnitCost;
    return formatMoney(salesUnitCost * (profile.coefficient || 1));
}

function updateSalesComponentPrice(
    form: DykeFormReturn,
    _pData: Partial<ComponentPrice>,
    basePrice,
    qty = 1,
) {
    const pData = _pData || {};
    // if (!pData) pData = {};
    if (!pData.id) pData.id = generateRandomString();
    pData.baseUnitCost = basePrice;
    pData.salesUnitCost = salesProfileCost(form, basePrice);
    pData.qty = qty;
    // Calculate tax cost;
    // set margin
    // set tax percentage
    pData.salesTotalCost = formatMoney(qty * pData.salesUnitCost);
    pData.baseTotalCost = formatMoney(qty * basePrice);
    // pData.grandTotal = tax + salesTotal etc.

    return pData;
}
function updateSalesComponentPriceQty(
    pData: Partial<ComponentPrice>,
    qty,
    args?: {
        form?: DykeFormReturn;
    },
) {}
const salesFormUtils = {
    salesProfileChanged,
    salesProfileCost,
    baseProfileCost,
    componentPrice: {
        update: updateSalesComponentPrice,
        updateQty: updateSalesComponentPriceQty,
    },
};
const ctx = salesFormUtils;
export default salesFormUtils;
