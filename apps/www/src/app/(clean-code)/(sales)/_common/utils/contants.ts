import {
    filterCol,
    filterFields,
    Filters,
} from "@/components/(clean-code)/data-table/filter-command/filters";
// import { SalesPriority } from "@gnd/db";

import {
    DeliveryOption,
    PaymentMethods,
    SalesDispatchStatus,
} from "../../types";
const SalesPriority = [] as any;
export const SEPARATOR = ` &`;

export const dispatchStatusList: SalesDispatchStatus[] = [
    "queue",
    "in progress",
    "cancelled",
    "completed",
] as const;

export const INVOICE_FILTER_OPTIONS = [
    "paid",
    "pending",
    "late",
    "part-paid",
    "overdraft",
] as const;
export const PRODUCTION_FILTER_OPTIONS = [
    "pending",
    "in progress",
    "completed",
] as const;
export const PRODUCTION_STATUS = [
    "not assigned",
    "part assigned",
    "due today",
    "past due",
    "completed",
    "not completed",
] as const;
export const PRODUCTION_ASSIGNMENT_FILTER_OPTIONS = [
    "not assigned",
    "part assigned",
    "all assigned",
] as const;
export const DISPATCH_FILTER_OPTIONS = [
    "delivered",
    "pending delivery",
    "backorder",
    "late",
] as const;
export const widthList = [
    "1-0",
    "1-4",
    "1-6",
    "1-8",
    "1-10",
    "2-0",
    "2-4",
    "2-6",
    "2-8",
    "2-10",
    "3-0",
    "4-0",
    "4-8",
    "5-0",
    "5-4",
    "5-8",
    "6-0",
    "6-8",
];
export const __filters = (): Filters => ({
    "production-tasks": {
        fields: [
            // filterFields["production.assignedToId"],
            filterFields["order.no"],
            filterFields["production"],
            filterFields.search,
            filterFields["production.dueDate"],
        ],
    },
    "sales-delivery": {
        fields: [],
        filterColumns: [],
    },
    "sales-productions": {
        fields: [
            filterFields["order.no"],
            filterFields["production"],
            filterFields.search,
            filterFields["production.dueDate"],
        ],
        options: {
            invoice: INVOICE_FILTER_OPTIONS,
            "dispatch.status": DISPATCH_FILTER_OPTIONS,
            production: PRODUCTION_FILTER_OPTIONS,
            "production.assignment": PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
            "sales.priority": Object.keys(SalesPriority),
        },
    },
    customers: {
        fields: [
            filterFields.search,
            //
        ],
        filterColumns: [
            filterCol("search"),
            //
        ],
    },
    orders: {
        fields: [
            filterFields["order.no"],
            filterFields.po,
            filterFields.phone,
            filterFields["customer.name"],
            filterFields["dispatch.status"],
            filterFields["production.assignment"],
            filterFields.production,
            filterFields.invoice,
            filterFields["sales.rep"],
            filterFields.search,
            filterFields["sales.priority"],
        ],
        filterColumns: [
            filterCol("order.no"),
            filterCol("customer.name"),
            filterCol("dispatch.status"),
            filterCol("production.assignment"),
            filterCol("production"),
            filterCol("invoice"),
            filterCol("sales.rep"),
            filterCol("search"),
            filterCol("sales.priority"),
        ],
        options: {
            invoice: INVOICE_FILTER_OPTIONS,
            "dispatch.status": DISPATCH_FILTER_OPTIONS,
            production: PRODUCTION_FILTER_OPTIONS,
            "production.assignment": PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
            "sales.priority": Object.keys(SalesPriority),
        },
    },
    quotes: {
        fields: [
            filterFields.search,
            filterFields["order.no"],
            filterFields.po,
            filterFields.phone,
            filterFields["customer.name"],
            // filterFields["dispatch.status"],
            // filterFields["production.assignment"],
            // filterFields.production,
            // filterFields.invoice,
            filterFields["sales.rep"],
            // filterFields.search,
            // filterFields["sales.priority"],
            //
        ],
        filterColumns: [
            filterCol("search"),
            //
        ],
    },
    "sales-accounting": {
        fields: [
            filterFields.search,
            filterFields["order.no"],

            //
        ],
        // filterColumns: [filterCol("search"), filterCol("order.no")],
        options: {},
    },
});

export const paymentMethods: {
    label?: string;
    value?: PaymentMethods;
}[] = [
    { label: "Terminal Payment", value: "terminal" },
    { label: "Check", value: "check" },
    { label: "Payment Link", value: "link" },
    { label: "Wire Transfer", value: "wire" },
    { label: "Credit Card", value: "credit-card" },
    { label: "Zelle", value: "zelle" },
    { label: "Cash", value: "cash" },
];
export const dispatchModes: { label?: string; value?: DeliveryOption }[] = [
    { label: "Delivery", value: "delivery" },
    { label: "Pickup", value: "pickup" },
];
