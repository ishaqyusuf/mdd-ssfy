import { labelValue, textValue } from "@/lib/utils";
import { DykeDoorType } from "../sales-v2/type";
import { ShowCustomerHaving } from "@/app/(v1)/(loggedIn)/sales/type";

export default {
    paymentOptions: ["Cash", "Credit Card", "Check", "COD", "Zelle"],
    delivery: [
        textValue("Pickup", "pickup"),
        textValue("Delivery", "delivery"),
    ],
    paymentTerms: [
        textValue("None"),
        textValue("Net10"),
        textValue("Net20"),
        textValue("Net30"),
    ],
    addressTabs: [
        { value: "billingAddress", name: "Billing" },
        { value: "shippingAddress", name: "Shipping" },
    ],
    productionDoorTypes: ["Garage", "Interior", "Exterior"] as DykeDoorType[],
    filters: {
        invoiceHaving: [
            {
                label: "Pending Invoice",
                value: "Pending Invoice" as ShowCustomerHaving,
            },
            {
                label: "No Pending Invoice",
                value: "No Pending Invoice" as ShowCustomerHaving,
            },
        ],
        due: [
            labelValue("1-30 Days Past Due", "1-30"),
            labelValue("31-60 Days Past Due", "31-60"),
            labelValue("61-90 Days Past Due", "61-90"),
            labelValue("Over 90 Days Past Due", ">90"),
        ],
        production: [
            { label: "Production Started", value: "Started" },
            { label: "Production Assigned", value: "Queued" },
            {
                label: "Production Completed",
                value: "Completed",
            },
            {
                label: "Production Not Assigned",
                value: "Unassigned",
            },
        ],
        invoice: [
            { label: "Paid", value: "Paid" },
            // { label: "Part Paid", value: "Part" },
            { label: "Pending", value: "Pending" },
        ],
    },
};
