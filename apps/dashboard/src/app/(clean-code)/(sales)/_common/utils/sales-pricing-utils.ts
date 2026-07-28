import { GetPricingList } from "../data-access/sales-pricing-dta";

export function composeSalesPricing(data: GetPricingList) {
    const priceData: {
        [uid in string]: {
            [depUid in string]: {
                id;
                price;
            };
        };
    } = {};
    data.map((pricing) => {
        const uid = pricing.stepProductUid;
        const depUid = pricing.dependenciesUid || pricing.stepProductUid;
        if (!priceData[uid]) priceData[uid] = {};
        priceData[uid][depUid] = {
            id: pricing.id,
            price: pricing.price,
        };
    });
    return priceData;
}
