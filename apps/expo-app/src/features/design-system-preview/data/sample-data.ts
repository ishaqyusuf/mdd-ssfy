import type { IconKeys } from "@/components/ui/icon";

export type PreviewStatus = "ready" | "pending" | "blocked" | "complete";

export type PreviewMetric = {
	label: string;
	value: string;
	tone: PreviewStatus;
};

export type PreviewRecord = {
	id: string;
	title: string;
	subtitle: string;
	status: PreviewStatus;
	meta: { icon: IconKeys; label: string }[];
	amount?: string;
	action?: string;
};

export const opsMetrics: PreviewMetric[] = [
	{ label: "Open Jobs", value: "42", tone: "ready" },
	{ label: "Delayed", value: "7", tone: "pending" },
	{ label: "Blocked", value: "3", tone: "blocked" },
	{ label: "Ready", value: "18", tone: "complete" },
];

export const opsRecords: PreviewRecord[] = [
	{
		id: "J-1048",
		title: "Hampton Heights Millwork",
		subtitle: "Kitchen package awaiting production review",
		status: "pending",
		meta: [
			{ icon: "Briefcase", label: "Job #1048" },
			{ icon: "MapPin", label: "Austin" },
			{ icon: "Clock", label: "Today, 2:30 PM" },
		],
	},
	{
		id: "D-286",
		title: "North Ridge Delivery",
		subtitle: "Packed and ready for dispatch",
		status: "ready",
		meta: [
			{ icon: "Truck", label: "Route 12" },
			{ icon: "ClipboardCheck", label: "8 items" },
			{ icon: "User", label: "M. Porter" },
		],
	},
	{
		id: "S-7719",
		title: "BuildRight Quote Approval",
		subtitle: "Customer change request needs sales review",
		status: "blocked",
		meta: [
			{ icon: "ReceiptText", label: "Quote" },
			{ icon: "CircleDollarSign", label: "$18.4k" },
			{ icon: "TriangleAlert", label: "Change order" },
		],
	},
];

export const fieldMetrics: PreviewMetric[] = [
	{ label: "Stops", value: "6", tone: "ready" },
	{ label: "Packed", value: "4", tone: "complete" },
	{ label: "Issues", value: "1", tone: "blocked" },
];

export const fieldRecords: PreviewRecord[] = [
	{
		id: "PK-221",
		title: "Pack cabinet doors",
		subtitle: "Bay 3 - verify hinge side before loading",
		status: "ready",
		action: "Pack",
		meta: [
			{ icon: "Warehouse", label: "Warehouse" },
			{ icon: "ClipboardList", label: "12 lines" },
		],
	},
	{
		id: "RT-08",
		title: "Start delivery route",
		subtitle: "Three customer stops before noon",
		status: "pending",
		action: "Start",
		meta: [
			{ icon: "Truck", label: "Route 8" },
			{ icon: "Clock", label: "8:45 AM" },
		],
	},
	{
		id: "IN-44",
		title: "Install review",
		subtitle: "Upload final job photos and close checklist",
		status: "complete",
		action: "Review",
		meta: [
			{ icon: "Camera", label: "Photos" },
			{ icon: "CheckCircle2", label: "Checklist" },
		],
	},
];

export const salesMetrics: PreviewMetric[] = [
	{ label: "Orders", value: "128", tone: "ready" },
	{ label: "Due", value: "$42.6k", tone: "pending" },
	{ label: "In Prod.", value: "31", tone: "complete" },
];

export const salesRecords: PreviewRecord[] = [
	{
		id: "SO-4321",
		title: "Blue Oak Builders",
		subtitle: "Production in progress",
		status: "pending",
		amount: "$12,840.00",
		meta: [
			{ icon: "ReceiptText", label: "SO-4321" },
			{ icon: "HardHat", label: "Production" },
			{ icon: "Clock", label: "Due Fri" },
		],
	},
	{
		id: "SO-4319",
		title: "Everline Homes",
		subtitle: "Ready for delivery scheduling",
		status: "ready",
		amount: "$8,420.50",
		meta: [
			{ icon: "Truck", label: "Delivery" },
			{ icon: "CheckCircle2", label: "Paid" },
			{ icon: "MapPin", label: "Dallas" },
		],
	},
	{
		id: "QT-778",
		title: "Summit Renovation",
		subtitle: "Quote waiting on approval",
		status: "blocked",
		amount: "$21,300.00",
		meta: [
			{ icon: "FileText", label: "Quote" },
			{ icon: "TriangleAlert", label: "Review" },
			{ icon: "User", label: "Dealer" },
		],
	},
];
