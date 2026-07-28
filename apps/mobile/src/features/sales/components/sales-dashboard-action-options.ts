import type { IconKeys } from "@/components/ui/icon";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";

export type SalesDashboardAction = "sales" | "quote" | "dispatch";

export type SalesDashboardActionOption = {
	action: SalesDashboardAction;
	title: string;
	description: string;
	icon: IconKeys;
};

export const salesDashboardActionOptions: SalesDashboardActionOption[] = [
	{
		action: "sales",
		title: "Sales",
		description: "Create a sales invoice for an order.",
		icon: "ReceiptText",
	},
	{
		action: "quote",
		title: "Quote",
		description: "Prepare a customer quote before approval.",
		icon: "FileText",
	},
	{
		action: "dispatch",
		title: "Dispatch",
		description: "Search an order and create a delivery.",
		icon: "Truck",
	},
];

export function getSalesDashboardDocumentType(
	action: SalesDashboardAction,
): NewSalesFormType | null {
	if (action === "sales") return "order";
	if (action === "quote") return "quote";
	return null;
}

export function getSalesCustomerSelectorRoute(type: NewSalesFormType) {
	return {
		pathname: "/(sales)/invoices/customer-selector",
		params: { type, source: "new" },
	} as const;
}

export function getSalesDispatchCreateRoute() {
	return "/(sales)/dispatch/new" as const;
}
