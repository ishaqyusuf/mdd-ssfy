/** @jsxImportSource react */
import type { IconKeys } from "../../icons";

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
	po: "post",
	"sales.rep": "user",
	"sales.priority": "flag",
	priority: "flag",
	salesRepId: "user",
	invoice: "invoice",
	invoiceStatus: "invoice",
	item: "products",
	paymentReview: "payment",
	salesChannel: "Share",
	inbound: "inbound",
	"salesRep.id": "user",
	"dispatch.status": "dispatch",
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
	template: "template",
	installCost: "installCosts",
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
