import type { IconKeys } from "../../icons";

export const searchIcons: Partial<{
	[id in string]: IconKeys;
}> = {
	q: "Search",
	address: "Address",
	orderNo: "Orders",
	salesNo: "Orders",
	"customer.name": "User",
	customerName: "User",
	phone: "Phone",
	search: "Search",
	"production.assignedToId": "Production",
	"production.assignment": "Production",
	"production.status": "Production",
	production: "Production",
	"production.dueDate": "Calendar",
	scheduleDate: "Calendar",
	po: "Inbound",
	"sales.rep": "User",
	salesRepId: "User",
	invoice: "CommunityInvoice",
	invoiceStatus: "CommunityInvoice",
	"salesRep.id": "User",
	"dispatch.status": "Export",
	status: "Status",
	dateRange: "Calendar",
	showing: "Laptop",
	show: "Laptop",
	category: "Category",
	categoryId: "Category",
	reportCategory: "Category",
	payments: "Wallet",
	paymentType: "Payment",
	project: "Project",
	projectId: "Project",
	projectSlug: "Project",
	builder: "User",
	builderId: "User",
	builderSlug: "User",
	contractor: "User",
	authorizedBy: "User",
	role: "User",
	profile: "User",
	refNo: "Description",
	taskNames: "Tasks",
	installation: "Installation",
};

export function isSearchKey(k) {
	return k === "q" || k === "search" || k?.startsWith("_q");
}
export function getSearchKey(filters) {
	return Object.entries(filters || {}).find(([k, v]) => isSearchKey(k))?.[0];
}
