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
    ISalesOrderItemMeta,
    SaveOrderActionProps,
} from "@/types/sales";
import dayjs from "dayjs";

// type form =
export default {
    _calculatePaymentTerm,
    calibrateLines,
    formData,
    generateInvoiceItem,
    initInvoiceItems,
    moreInvoiceLines,
    newInvoiceLine,
    copySalesItem,
    taxxable(taxxable): boolean {
        taxxable = taxxable || false;
        if (typeof taxxable == "string") taxxable = taxxable == "Tax";
        return taxxable;
    },
};
function copySalesItem(item) {
    const { id, meta, createdAt, updatedAt, _ctx, ...itemData } = deepCopy(
        item || {
            meta: {},
        },
    ) as ISalesFormItem;
    const { produced_qty, uid, ..._meta } = meta as ISalesOrderItemMeta;
    return {
        ...itemData,
        _ctx: {
            id: generateRandomString(4),
        },
        meta: _meta,
    };
}
function formData(data, paidAmount): SaveOrderActionProps {
    let {
        id,
        items: _items,
        shippingAddress,
        billingAddress,
        customer,
        salesRep,
        _lineSummary,
        ...formValues
    }: ISalesForm = deepCopy(data);

    formValues.amountDue = Number(formValues.grandTotal || 0) - paidAmount;
    formValues.meta = removeEmptyValues(formValues.meta);
    const deleteIds: number[] = [];

    let items = calibrateLines(_items)
        ?.map(({ salesOrderId, _ctx, ...item }, index) => {
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

function _calculatePaymentTerm(paymentTerm, createdAt) {
    const t = parseInt(paymentTerm?.replace("Net", ""));
    let goodUntil: any = null;
    if (t) {
        goodUntil = dayjs(createdAt).add(t, "days").toISOString();
    }
    console.log({ paymentTerm, goodUntil });

    // form.setValue("goodUntil", goodUntil);
    // console.log([paymentTerm, createdAt, t, goodUntil]);
    return goodUntil;
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
            const _ = generateInvoiceItem(_itemsByIndex[uid]);

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
function generateInvoiceItem(baseItem: any = null) {
    if (!baseItem) baseItem = { meta: {} };
    // let price = baseItem?.rate || baseItem?.price || null;

    const _: ISalesFormItem = {
        description: null,
        swing: null,
        supplier: null,
        qty: null,
        rate: null,
        tax: null,
        price: null,
        ...baseItem,
        meta: {
            tax: true, // "Tax",
            sales_margin: "Default",
            ...(baseItem?.meta ?? {}),
        },
        _ctx: {
            id: generateRandomString(4),
            ...(baseItem?._ctx ?? {}),
        },
    } as any;
    // console.log("generating...", _);
    // if (_.id) _.meta.tax = (_.tax || 0) > 0 ? "Tax" : "Non";
    return _;
}
function newInvoiceLine(toIndex, fields: ISalesFormItem[]) {
    if (toIndex == -1) fields.unshift(generateInvoiceItem());
    else if (toIndex == fields.length - 1) fields.push(generateInvoiceItem());
    else
        fields = [
            ...fields.slice(0, toIndex),
            generateInvoiceItem(),
            ...fields.slice(toIndex),
        ];
    return calibrateLines(fields);
}
export function moreInvoiceLines() {
    // const baseUID = fields.length;
    const fields: any[] = [];
    Array(5)
        .fill(null)
        .map((c, uid) => {
            fields.push(generateInvoiceItem());
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
