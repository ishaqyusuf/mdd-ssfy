export const Cookies = {
    SalesChartType: "sales-chart-type",
    SalesRoute: "sales-route",
    QuotesRoute: "quote-route",
    LastSquareTerminalUsed: "last-square-terminal",
};
export const ROUTE_VERSIONS = {
    sales: {
        old: "/sales",
        new: "",
    },
    quotes: {
        old: "",
        new: "",
    },
};
export const Tags = {
    salesAssignments: "sales_assingments",
    salesDispatchers: "sales_dispatchers",
    salesCustomers: "sales_customers",
    salesCustomerProfiles: "sales_customer_profiles",
    salesTaxCodes: "sales_tax_codes",
    shelfProducts: "shelf_products",
    shelfCategories: "shelf-categories",
    siteActionNotifications: "site_action_notifications",
    users: "users",
    salesOrderNos: "sales_order_nos",
    quoteSalesNos: "quote_sales_nos",
    rootStepComponents: "root-step-components",
    takeOffTemplates: "takeoff-templates",
};
export const Events = {
    salesCreated: "sales_created",
    salesDeleted: "sales_deleted",
    salesUpdated: "sales_updated",
    paymentApplied: "sales_payment_applied",
    paymentDeleted: "sales_payment_deleted",
} as const;
export type EventTypes = keyof typeof Events;

export const Placeholders = {
    date: "03/19/25",
    money: "100",
    orderId: "03327PC",
    moneyLarge: "10,000",
    moneyFormated: "$100",
    moneyLargeFormated: "$10,000",
    textLg: "lorem ipsum dolor sit amet",
    textSm: "lorem ipsum dolor",
} as const;
export type PaymentMethods =
    | "link"
    | "terminal"
    | "check"
    | "cash"
    | "zelle"
    | "credit-card"
    | "wire";
export const paymentMethods = [
    "link",
    "terminal",
    "check",
    "cash",
    "zelle",
    "credit-card",
    "wire",
] as const;
export const salesPaymentMethods: {
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
] as const;

export const CUSTOM_IMG_ID = "ff8zkn817rjqv6ml2qdr";

export const actionTicketTypes = [
    "sales-customer-transaction",
    "sales-labor-cost",
    "employee-role",
    "employee-profile",
    "order",
    "quote",
] as const;
export const actionTicketEvents = [
    "deleted",
    "created",
    "edited",
    "restored",
] as const;
