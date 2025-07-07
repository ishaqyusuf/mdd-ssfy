import { sum as _sum, sum } from "@/lib/utils";
import { DykeForm } from "../type";
import { formatMoney } from "@/lib/use-number";

export function calculateSalesEstimate(data: DykeForm) {
    // const estimate = calculateFooterEstimate(data, null);
    // data.order.grandTotal = estimate.grandTotal;
    // console.log(estimate.grandTotal);

    data.order.amountDue =
        data.order.type == "order"
            ? data.order.grandTotal - (data.paidAmount || 0)
            : data.order.grandTotal;
    // data.order.meta.ccc = estimate.ccc;
    return data;
    data.order.grandTotal = data.order.subTotal = data.order.tax = 0;
    data.order.taxPercentage = +(data.order.taxPercentage || 0);

    data.itemArray.map((item) => {
        calculateShelfItems(item);
        taxEstimateAndUpdateTotal(item, data);
    });
    const {
        subTotal,
        tax,
        meta: { labor_cost = 0, discount = 0, payment_option },
    } = data.order;

    let total = formatMoney(subTotal + labor_cost);
    let ccc = 0;
    const cccPercentage = Number(data.data?.settings?.ccc || 0);
    if (payment_option == "Credit Card")
        ccc += formatMoney((cccPercentage / 100) * (total + tax));
    data.order.meta.ccc = ccc;
    data.order.meta.ccc_percentage = cccPercentage;
    const dt = (data.order.grandTotal = formatMoney(
        ccc + tax + total - (discount || 0)
    ));
    data.order.amountDue = dt - (data.paidAmount || 0);
    console.log({ subTotal, total, ccc, labor_cost, tax, discount });

    return data;
}
function taxEstimateAndUpdateTotal(
    item: DykeForm["itemArray"][0],
    formData: DykeForm
) {
    // if (!formData.order.tax)
    formData.order.tax = 0;
    // if (!formData.order.subTotal)

    const totalPrice = item.item.total || 0;
    (formData.order as any).subTotal += totalPrice;
    let tax = 0;
    if (formData.order.taxPercentage && formData.order.meta.tax) {
        const tx = formData.order.taxPercentage / 100;
        // tax = formatMoney(totalPrice * tx);
        let taxxable = 0;
        tax =
            sum(
                formData.itemArray.map((a) => {
                    if (a.item.meta.tax) taxxable += a.item.total || 0;

                    return a.item.meta.tax || a.item.meta.doorType != "Services"
                        ? a.item.total || 0
                        : 0;
                })
            ) * tx;
        console.log({ taxxable, tax });
    }
    tax = formatMoney(tax);
    item.item.tax = tax;
    formData.order.tax += tax;
}
function calculateShelfItems(item: DykeForm["itemArray"][0]) {
    if (item.item.shelfItemArray?.length) {
        let sum = {
            doors: 0,
            unitPrice: 0,
            totalPrice: 0,
            tax: 0,
        };
        item.item.shelfItemArray.map((shelf) => {
            shelf.productArray
                .filter((p) => p.item)
                .map((prod) => {
                    sum.totalPrice += prod.item.totalPrice || 0;
                });
        });
        item.item.qty = 0;
        item.item.rate = item.item.price = item.item.total = sum.totalPrice;
    }
}
