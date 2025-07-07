import { Prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { dotArray } from "@/lib/utils";
import { isDate } from "lodash";

import { dotKeys, dotObject } from "../utils/utils";
import { CellTransform, ExportForm, ExportTypes, TypedExport } from "./type";

type OrderSelect = Prisma.SalesOrdersSelect;
// type ExportCells = Partial<{
//     [type in ExportTypes]: {
//         [title in string]: object | any;
//     };
// }>;
// type CellTransform = Partial<{
//     [type in ExportTypes]: {
//         {[title in CellTypes<type>]: any}
//     }
// }>;
// type CellTypes<T> =  keyof (typeof exportCells)[T]
export const exportCells = {
    order: {
        "Amount Due": salesSelect("amountDue"),
        "Amount Paid": salesSelect("payments"),
        "Order Date": salesSelect("createdAt"),
        "Order Id": salesSelect("orderId"),
        "Customer Name": salesCustomerSelect("name"),
        "Customer Address": salesCustomerSelect("address"),
        "Business Name": salesCustomerSelect("businessName"),
        "Sales Rep": salesRepSelect("name"),
        "Customer Phone": salesCustomerSelect("phoneNo"),
        "Customer Phone 2": salesCustomerSelect("phoneNo2"),
        "Invoice Due Date": salesSelect("paymentDueDate"),
        "P.O No": salesSelect("meta"),
    } as const,
    quote: {} as const,
} as const;
export const cellTransform: CellTransform = {
    order: {
        "Invoice Due Date": (value, data) => formatDate(value),
        "Amount Paid": (value, data) => {},
    },
};
function salesSelect(node: keyof OrderSelect): OrderSelect {
    return {
        [node]: true,
    };
}
function nodules(type) {
    const node = exportCells[type];
    let list: ExportForm["cellList"] = [];
    Object.entries(node || {}).map(([title, include]) => {
        const selectNode = dotKeys(include)[0];
        list.push({
            title,
            selectNode,
            valueNode: selectNode.replaceAll(".select.", "."),
        });
    });
    return list;
}
export function getIncludes(formData: ExportForm) {
    let includes = {};

    Object.entries(formData.exports).map(([valueKey, selected]) => {
        if ((selected as any) == true) {
            const cell = formData.cellList.find((s) => s.valueNode == valueKey);
            // console.log({ valueKey, cell, selected });
            includes[cell.selectNode] = true;
        }
    });
    return dotObject.object(includes);
    // return;
}
function transformValue(value, type: ExportTypes) {
    // console.log({ value });
    if (isDate(value)) {
        const _v = formatDate(value); //dayjs(value).format("DD-MM-YYYY");
        // console.log({ _v });

        return _v;
    }
    return value;
}
export function transformExportData(formData: ExportForm, data) {
    return data.map((item) => {
        Object.keys(item).map((k) => {
            item[k] = transformValue(item[k], formData.type);
        });
        const dot = dotArray(item);
        const trans = {};
        // console.log({ dot, item });
        Object.entries(dot).map(([dotKey, dotValue]) => {
            const cell = formData.cellList.find((c) => c.valueNode == dotKey);

            if (cell) {
                trans[cell.title] = transformValue(dotValue, formData.type);
            }
        });
        return trans;
    });
}
export function getExportForm(
    type: ExportTypes,
    config?: TypedExport,
): ExportForm {
    const _ = {
        exports: {},
        title: "",
        cellList: nodules(type),
        type,
    };
    return _;
}
function transformExportForm(form: ExportForm) {}
// let c:keyof Prisma.SalesOrdersCountOutputTypeDefaultArgs['select'] = ''
function salesRepSelect(node: keyof Prisma.UsersSelect): OrderSelect {
    return {
        salesRep: {
            select: {
                [node]: true,
            },
        },
    };
}
function salesCustomerSelect(node: keyof Prisma.CustomersSelect): OrderSelect {
    return {
        customer: {
            select: {
                [node]: true,
            },
        },
    };
}
