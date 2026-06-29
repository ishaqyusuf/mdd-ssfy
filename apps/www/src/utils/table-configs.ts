import type { StickyColumnConfig } from "@/components/tables-2/core";
import type { TableId } from "@/utils/table-settings";

export const STICKY_COLUMNS: Record<TableId, StickyColumnConfig[]> = {
    "sales-orders": [
        { id: "select", width: 50 },
        { id: "orderId", width: 180 },
    ],
    "sales-quotes": [
        { id: "select", width: 50 },
        { id: "orderId", width: 180 },
    ],
    customers: [{ id: "customer", width: 300 }],
    "sales-dispatch": [
        { id: "select", width: 50 },
        { id: "orderId", width: 180 },
    ],
    "inbound-management": [{ id: "orderId", width: 180 }],
    "sales-accounting": [
        { id: "select", width: 50 },
        { id: "createdAt", width: 150 },
    ],
    "sales-statistics": [{ id: "productName", width: 320 }],
    "inventory-products": [
        { id: "select", width: 50 },
        { id: "product", width: 320 },
    ],
    "inventory-categories": [
        { id: "select", width: 50 },
        { id: "category", width: 320 },
    ],
    "inventory-import": [{ id: "category", width: 340 }],
    "community-builders": [{ id: "builder", width: 340 }],
    "community-templates": [{ id: "model", width: 320 }],
    "customer-service": [
        { id: "select", width: 50 },
        { id: "appointment", width: 180 },
    ],
    "unit-invoices": [{ id: "lotBlock", width: 280 }],
    "unit-productions": [
        { id: "select", width: 50 },
        { id: "dueDate", width: 170 },
    ],
};

export const SORT_FIELD_MAPS: Record<TableId, Record<string, string>> = {
    "sales-orders": {
        orderId: "orderId",
        status: "status",
        salesDate: "createdAt",
        customerName: "customerName",
        invoiceTotal: "grandTotal",
        amountDue: "amountDue",
        productionLabel: "prodStatus",
        fulfillmentLabel: "deliveredAt",
        salesRepName: "salesRepName",
    },
    "sales-quotes": {
        orderId: "orderId",
        salesDate: "createdAt",
        invoiceTotal: "grandTotal",
    },
    customers: {
        customer: "name",
        phoneNo: "phoneNo",
        email: "email",
        address: "address",
    },
    "sales-dispatch": {
        orderId: "orderId",
        dueDate: "dueDate",
        orderDate: "createdAt",
        status: "status",
        assignedTo: "driverId",
    },
    "inbound-management": {},
    "sales-accounting": {},
    "sales-statistics": {},
    "inventory-products": {},
    "inventory-categories": {},
    "inventory-import": {},
    "community-builders": {
        builder: "name",
    },
    "community-templates": {
        model: "modelName",
    },
    "customer-service": {
        appointment: "scheduleDate",
        customer: "homeOwner",
        status: "status",
    },
    "unit-invoices": {
        lotBlock: "lotBlock",
        project: "project",
        date: "date",
    },
    "unit-productions": {
        dueDate: "dueDate",
        task: "task",
        unit: "unit",
        project: "project",
    },
};

export const NON_REORDERABLE_COLUMNS: Record<TableId, Set<string>> = {
    "sales-orders": new Set(["select", "orderId", "actions"]),
    "sales-quotes": new Set(["select", "orderId", "actions"]),
    customers: new Set(["customer", "actions"]),
    "sales-dispatch": new Set(["select", "orderId", "actions"]),
    "inbound-management": new Set(["orderId", "actions"]),
    "sales-accounting": new Set(["select", "createdAt", "actions"]),
    "sales-statistics": new Set(["productName"]),
    "inventory-products": new Set(["select", "product", "actions"]),
    "inventory-categories": new Set(["select", "category", "actions"]),
    "inventory-import": new Set(["category"]),
    "community-builders": new Set(["builder", "actions"]),
    "community-templates": new Set(["model", "actions"]),
    "customer-service": new Set(["select", "appointment", "actions"]),
    "unit-invoices": new Set(["lotBlock", "actions"]),
    "unit-productions": new Set(["select", "dueDate", "actions"]),
};

export const ROW_HEIGHTS: Record<TableId, number> = {
    "sales-orders": 40,
    "sales-quotes": 40,
    customers: 64,
    "sales-dispatch": 64,
    "inbound-management": 64,
    "sales-accounting": 64,
    "sales-statistics": 72,
    "inventory-products": 72,
    "inventory-categories": 64,
    "inventory-import": 72,
    "community-builders": 64,
    "community-templates": 72,
    "customer-service": 72,
    "unit-invoices": 72,
    "unit-productions": 72,
};

export const SUMMARY_GRID_HEIGHTS: Partial<Record<TableId, number>> = {
    "sales-orders": 180,
};
