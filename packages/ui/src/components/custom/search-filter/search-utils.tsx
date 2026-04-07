import type { IconKeys } from "../icons";

export const searchIcons: Partial<{
	[id in string]: IconKeys;
}> = {
	q: "Search",
	address: "address",
	orderNo: "orders",
	salesNo: "orders",
	"customer.name": "user",
	customerName: "user",
	phone: "phone",
	search: "Search",
	"production.assignedToId": "production",
	"production.assignment": "production",
	"production.status": "production",
	production: "production",
	"production.dueDate": "calendar",
	scheduleDate: "calendar",
	po: "inbound",
	"sales.rep": "user",
	salesRepId: "user",
	invoice: "communityInvoice",
	invoiceStatus: "communityInvoice",
	"salesRep.id": "user",
	"dispatch.status": "Export",
	status: "Status",
	dateRange: "calendar",
	showing: "monitor",
	show: "monitor",
	category: "category",
	categoryId: "category",
	reportCategory: "category",
	payments: "cash",
	paymentType: "payment",
	project: "project",
	projectId: "project",
	projectSlug: "project",
	builder: "user",
	builderId: "user",
	builderSlug: "user",
	contractor: "user",
	authorizedBy: "user",
	role: "roles",
	profile: "profile",
	refNo: "post",
	taskNames: "tasks",
	installation: "installation",
};

export function isSearchKey(k) {
	return k === "q" || k === "search" || k?.startsWith("_q");
}
export function getSearchKey(filters) {
	return Object.entries(filters || {}).find(([k, v]) => isSearchKey(k))?.[0];
}
