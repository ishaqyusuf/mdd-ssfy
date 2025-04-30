import {
    ISalesForm,
    ISalesFormItem,
} from "@/app/(v2)/(loggedIn)/sales/edit/type";
import { SalesOrderItems, SalesOrders } from "@/db";
import { deepCopy } from "@/lib/deep-copy";
import { numeric } from "@/lib/use-number";
import { generateRandomString, removeEmptyValues } from "@/lib/utils";
import {
    IFooterInfo,
    ISalesOrder,
    ISalesOrderForm,
    ISalesOrderItem,
    SaveOrderActionProps,
} from "@/types/sales";
import dayjs from "dayjs";

// type form =
export default {
    calculatePaymentTerm,
    calibrateLines,
    formData,
    generateInvoiceItem,
    initInvoiceItems,
    moreInvoiceLines,
    newInvoiceLine,
};
function formData(data, paidAmount): SaveOrderActionProps {
    let {
        id,
        items: _items,
        shippingAddress,
        billingAddress,
        customer,
        salesRep,
        ...formValues
    }: ISalesOrder = deepCopy(data);

    formValues.amountDue = Number(formValues.grandTotal || 0) - paidAmount;
    formValues.meta = removeEmptyValues(formValues.meta);
    const deleteIds: number[] = [];

    let items = calibrateLines(_items)
        ?.map(({ salesOrderId, ...item }, index) => {
            // delete (item as any)?.salesOrderId;
            if (!item.description && !item?.total) {
                if (item.id) deleteIds.push(item.id);

                return null;
            }

            return numeric<SalesOrderItems>(
                ["qty", "price", "rate", "tax", "taxPercenatage", "total"],
                item,
            );
        })
        .filter(Boolean);

    return {
        id,
        order: numeric<SalesOrders>(
            ["grandTotal", "amountDue", "tax", "taxPercentage", "subTotal"],
            formValues,
        ) as any,
        deleteIds,
        items: items as any,
    };
}
function calculatePaymentTerm(form: ISalesOrderForm, paymentTerm, createdAt) {
    const t = +paymentTerm?.replace("Net", "");
    let goodUntil: any = null;
    // console.log("CALCULATING PAYMENT TERM");
    if (t) {
        goodUntil = dayjs(createdAt).add(goodUntil, "days");
        console.log(goodUntil);
    }

    form.setValue("goodUntil", goodUntil);
}
function initInvoiceItems(items: ISalesFormItem[] | undefined) {
    if (!items) items = [];
    const _itemsByIndex: any = {};
    let rows = 20;
    items.map(({ ...item }) => {
        const li = [
            item.meta?.line_index,
            item.meta?.uid,
            item.meta?.lineIndex,
        ].filter((i) => i >= 0)[0];
        if (li >= 0) {
            _itemsByIndex[li] = item;
            if (li > rows) rows = li;
        }
    });
    const footer: IFooterInfo = {
        rows: {},
    };
    const _items = Array(rows + 1)
        .fill(null)
        .map((c, uid) => {
            const _ = generateInvoiceItem(uid, _itemsByIndex[uid]);
            let taxxable: any = _.meta?.tax || false;
            if (typeof taxxable == "string") taxxable = taxxable == "Tax";
            if (_.meta) _.meta.tax = taxxable;
            footer.rows[uid] = {
                rowIndex: uid,
                taxxable,
                total: 0,
            };
            return _;
        });

    return { _items, footer: footer.rows };
}
function generateInvoiceItem(uid, baseItem: any = null) {
    if (!baseItem) baseItem = { meta: {} };
    let price = baseItem?.rate || baseItem?.price;

    const _: ISalesFormItem = {
        ...baseItem,
        rate: null,
        price,
        meta: {
            tax: true,
            sales_margin: "Default",
            ...(baseItem?.meta ?? {}),
            uid,
        },
    } as any;
    // console.log("generating...", _);
    // if (_.id) _.meta.tax = (_.tax || 0) > 0 ? "Tax" : "Non";
    return _;
}
function newInvoiceLine(toIndex, fields: ISalesFormItem[]) {
    if (toIndex == -1) fields.unshift(generateInvoiceItem(0));
    else if (toIndex == fields.length - 1)
        fields.push(generateInvoiceItem(toIndex));
    else
        fields = [
            ...fields.slice(0, toIndex),
            generateInvoiceItem(toIndex),
            ...fields.slice(toIndex),
        ];
    return calibrateLines(fields);
}
export function moreInvoiceLines(fields: ISalesFormItem[]) {
    const baseUID = fields.length;
    Array(5)
        .fill(null)
        .map((c, uid) => {
            fields.push(generateInvoiceItem(uid + baseUID));
        });
    return fields;
}
function calibrateLines(fields) {
    return fields.map((i, uid) => {
        return {
            ...i,
            meta: removeEmptyValues({
                ...(i?.meta || {}),
                uid,
            }),
        };
    }) as ISalesFormItem[];
}
