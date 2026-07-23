import type { IconKeys } from "@/components/ui/icon";

export type TemplateTab = {
	icon: IconKeys;
	label: string;
};

export type PreviewFilterGroup = {
	key: string;
	label: string;
	options: { label: string; value: string }[];
};

export const opsConsoleTabs: TemplateTab[] = [
	{ icon: "LayoutGrid", label: "Home" },
	{ icon: "Mail", label: "Inbox" },
	{ icon: "ChartNoAxesColumn", label: "Sales" },
	{ icon: "Calendar", label: "Calendar" },
	{ icon: "more", label: "More" },
];

export const fieldFlowTabs: TemplateTab[] = [
	{ icon: "LayoutGrid", label: "Home" },
	{ icon: "Truck", label: "Route" },
	{ icon: "ClipboardList", label: "Pack" },
	{ icon: "Camera", label: "Proof" },
	{ icon: "User", label: "Me" },
];

export const salesLedgerTabs: TemplateTab[] = [
	{ icon: "LayoutGrid", label: "Home" },
	{ icon: "Briefcase", label: "Sales" },
	{ icon: "CircleDollarSign", label: "Money" },
	{ icon: "Truck", label: "Ship" },
	{ icon: "more", label: "More" },
];

export const opsDetailTabs = [
	"Overview",
	"Timeline",
	"Checklist",
	"Notes",
	"Actions",
];

export const fieldDetailTabs = [
	"Overview",
	"Stops",
	"Items",
	"Proof",
	"Activity",
];

export const salesDetailTabs = [
	"Overview",
	"Items",
	"Payments",
	"Fulfillment",
	"Activity",
];

export const opsFilterGroups: PreviewFilterGroup[] = [
	{
		key: "priority",
		label: "Priority",
		options: [
			{ label: "Urgent", value: "urgent" },
			{ label: "High", value: "high" },
			{ label: "Normal", value: "normal" },
		],
	},
	{
		key: "owner",
		label: "Owner",
		options: [
			{ label: "Sales", value: "Sales" },
			{ label: "Dispatch", value: "Dispatch" },
			{ label: "Production", value: "Production" },
			{ label: "Warehouse", value: "Warehouse" },
			{ label: "Field", value: "Field" },
			{ label: "Admin", value: "Admin" },
		],
	},
	{
		key: "window",
		label: "Due window",
		options: [
			{ label: "Today", value: "today" },
			{ label: "Tomorrow", value: "tomorrow" },
			{ label: "This week", value: "this week" },
		],
	},
	{
		key: "workType",
		label: "Work type",
		options: [
			{ label: "Job", value: "job" },
			{ label: "Sales", value: "sales" },
			{ label: "Dispatch", value: "dispatch" },
			{ label: "Warehouse", value: "warehouse" },
			{ label: "Service", value: "service" },
			{ label: "Install", value: "install" },
			{ label: "Admin", value: "admin" },
		],
	},
];

export const fieldFilterGroups: PreviewFilterGroup[] = [
	{
		key: "assignment",
		label: "Assignment",
		options: [
			{ label: "My work", value: "My work" },
			{ label: "My route", value: "My route" },
			{ label: "Team route", value: "Team route" },
			{ label: "Warehouse", value: "Warehouse" },
		],
	},
	{
		key: "routeWindow",
		label: "Route window",
		options: [
			{ label: "Morning", value: "morning" },
			{ label: "Afternoon", value: "afternoon" },
			{ label: "Today", value: "today" },
		],
	},
	{
		key: "workType",
		label: "Work type",
		options: [
			{ label: "Delivery", value: "delivery" },
			{ label: "Packing", value: "packing" },
			{ label: "Install", value: "install" },
			{ label: "Profile", value: "profile" },
		],
	},
];

export const salesFilterGroups: PreviewFilterGroup[] = [
	{
		key: "documentType",
		label: "Document type",
		options: [
			{ label: "Order", value: "order" },
			{ label: "Quote", value: "quote" },
			{ label: "Payment", value: "payment" },
			{ label: "Shipment", value: "shipment" },
			{ label: "Report", value: "report" },
			{ label: "Settings", value: "settings" },
		],
	},
	{
		key: "paymentState",
		label: "Payment",
		options: [
			{ label: "Paid", value: "paid" },
			{ label: "Partial", value: "partial" },
			{ label: "Not due", value: "not due" },
			{ label: "Not applicable", value: "all" },
		],
	},
	{
		key: "deliveryState",
		label: "Delivery",
		options: [
			{ label: "Production", value: "production" },
			{ label: "Ready", value: "ready" },
			{ label: "Not started", value: "not started" },
			{ label: "Not applicable", value: "all" },
		],
	},
	{
		key: "dateWindow",
		label: "Date window",
		options: [
			{ label: "This week", value: "this week" },
			{ label: "This month", value: "this month" },
		],
	},
];
