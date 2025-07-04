import { formatMoney } from "@/lib/use-number";
import { DykeForm } from "../type";
import { sum } from "@/lib/utils";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";

interface Props {
    footerPrices;
    laborCost;
    cccPercentage;
    paymentOption;
    discount;
    orderTax;
}
export function calculateFooterEstimate(data: DykeForm, args: Props) {
    if (!args) {
        args = {
            footerPrices: data.footer.footerPrices,
            laborCost: data.order.meta.labor_cost,
            cccPercentage: data.order.meta.ccc_percentage,
            paymentOption: data.order.meta.payment_option,
            discount: data.order.meta.discount,
            orderTax: data.order.meta.tax,
        };
    }
    const {
        footerPrices,
        laborCost,
        cccPercentage,
        paymentOption,
        discount,
        orderTax,
    } = args;
    let footr = data.footer.footerPricesJson;

    footr = JSON.parse(footerPrices);
    // const taxPercentage = data.order.taxPercentage;

    const items = data.itemArray;
    console.log(items.length);
    let subTotal = 0;
    // let tax = 0;
    let taxxable = 0;
    function calculate(uid) {
        let f = footr[uid];
        if (!f) return;
        if (!f.price) f.price = 0;

        subTotal += f.price;
        if (
            // taxPercentage &&
            (f?.tax || f?.doorType != "Services") &&
            orderTax
        ) {
            // console.log({ orderTax, f });
            taxxable += f.price;
            // const iTax = ((taxPercentage || 0) / 100) * f.price;
            // tax += iTax;
        }
    }
    items.map((item) => {
        if (item.multiComponent)
            Object.values(item.multiComponent.components)
                .filter(Boolean)
                .filter((c) => (c as any).checked)
                .map((v) => {
                    // console.log(v.uid);
                    calculate(v.uid);
                });

        // if(item.item.shelfItemArray)
        item.item.shelfItemArray?.map((shelfItem) => {
            calculate(shelfItem.uid);
        });
    });
    const taxForm = data._taxForm;
    let totalTax = 0;

    Object.entries(taxForm.taxByCode).map(([k, v]) => {
        if (v.selected) {
            let taxPercentage = v._tax.percentage;
            let taxOn = taxxable;
            taxForm.taxByCode[k].data.taxxable = taxxable;
            let _taxAmount = (taxForm.taxByCode[k].data.tax = formatMoney(
                (taxPercentage / 100) * taxOn
            ));
            totalTax += _taxAmount;
        }
    });
    // const taxes = taxForm.taxList
    //     .map((tx) => {
    //         const selection = taxForm.taxByCode[tx.taxCode];
    //         return {
    //             tx,
    //             selection,
    //             selected: selection?.selected,
    //         };
    //     })
    //     .filter((tx) => tx.selected)
    //     .map(({ selection, tx }) => {
    //         // let eTax = data.taxes.find((a) => a.taxCode == tx.code);
    //         // if (!eTax) eTax = {} as any;
    //         // eTax.taxCode = tx.code;
    //         selection.data.tax = 0;
    //         selection.data.taxxable = 0;
    //         // const on = tx.on;
    //         const [part1, part2] = tx.taxOn?.split(" ");
    //         let taxPercentage = tx.percentage;
    //         let taxOn = taxxable;
    //         if (part1 == "first") {
    //             taxOn = Math.min(taxOn, Number(part2));
    //         }
    //         // console.log({ taxPercentage, taxOn });
    //         if (taxPercentage && taxOn) {
    //             selection.data.taxxable = taxOn;
    //             selection.data.tax = formatMoney((taxPercentage / 100) * taxOn);
    //         }
    //         return selection;
    //     });

    const tax = formatMoney(totalTax);
    // console.log({ taxes, tax });
    let total = formatMoney(sum([subTotal, laborCost]));
    let ccc = 0;
    const cccP = Number(cccPercentage || 0);
    // console.log(cccP);

    if (paymentOption == "Credit Card") {
        // console.log(cccP);
        ccc = formatMoney((cccP / 100) * (total + tax));
        // console.log(ccc, [total + tax]);
    }
    const grandTotal = formatMoney(tax + ccc + total - (discount || 0));
    return {
        ccc,
        grandTotal,
        total,
        subTotal,
        tax,
        taxForm,
    };
}
