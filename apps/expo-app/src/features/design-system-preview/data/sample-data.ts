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
	tabs: string[];
	facets: Record<string, string>;
	meta: { icon: IconKeys; label: string }[];
	amount?: string;
	action?: string;
	detail?: {
		stops?: string[];
		items?: string[];
		proof?: string[];
		activity?: string[];
	};
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
		tabs: ["Home", "Calendar"],
		facets: {
			priority: "high",
			owner: "Production",
			window: "today",
			workType: "job",
		},
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
		tabs: ["Home", "Calendar"],
		facets: {
			priority: "high",
			owner: "Dispatch",
			window: "today",
			workType: "dispatch",
		},
		action: "Open route",
		detail: {
			stops: [
				"8:45 AM · North Ridge clubhouse",
				"10:15 AM · Lot 42 customer delivery",
				"11:30 AM · Returns at Dock 2",
			],
			items: ["8 packed line items", "1 signature packet", "2 photo checks"],
			proof: ["Vehicle load photo ready", "Customer signature required"],
			activity: ["Packed at 7:18 AM", "Driver assigned at 7:32 AM"],
		},
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
		tabs: ["Home", "Sales"],
		facets: {
			priority: "urgent",
			owner: "Sales",
			window: "today",
			workType: "sales",
		},
		amount: "$18,400",
		action: "Review change",
		meta: [
			{ icon: "ReceiptText", label: "Quote" },
			{ icon: "CircleDollarSign", label: "$18.4k" },
			{ icon: "TriangleAlert", label: "Change order" },
		],
	},
	{
		id: "W-512",
		title: "Warehouse Pull List",
		subtitle: "Door slabs staged, hardware bins still need verification",
		status: "pending",
		tabs: ["Home", "Inbox"],
		facets: {
			priority: "high",
			owner: "Warehouse",
			window: "today",
			workType: "warehouse",
		},
		action: "Verify bins",
		meta: [
			{ icon: "Warehouse", label: "Bay 4" },
			{ icon: "ClipboardList", label: "16 lines" },
			{ icon: "Clock", label: "Due 4:00 PM" },
		],
	},
	{
		id: "I-238",
		title: "Oakmont Install Closeout",
		subtitle: "Final photos uploaded, waiting on customer signature",
		status: "complete",
		tabs: ["Inbox"],
		facets: {
			priority: "normal",
			owner: "Field",
			window: "this week",
			workType: "install",
		},
		action: "Review closeout",
		meta: [
			{ icon: "Camera", label: "Photos" },
			{ icon: "CheckCircle2", label: "Checklist" },
			{ icon: "User", label: "A. Lee" },
		],
	},
	{
		id: "SO-8812",
		title: "Westfield Production Hold",
		subtitle: "Line item mismatch between quote and production packet",
		status: "blocked",
		tabs: ["Sales"],
		facets: {
			priority: "urgent",
			owner: "Production",
			window: "today",
			workType: "sales",
		},
		amount: "$9,860",
		action: "Resolve mismatch",
		meta: [
			{ icon: "HardHat", label: "Production" },
			{ icon: "ReceiptText", label: "SO-8812" },
			{ icon: "TriangleAlert", label: "Mismatch" },
		],
	},
	{
		id: "D-291",
		title: "South Loop Route",
		subtitle: "Driver assigned, route window confirmed with customer",
		status: "ready",
		tabs: ["Calendar"],
		facets: {
			priority: "normal",
			owner: "Dispatch",
			window: "tomorrow",
			workType: "dispatch",
		},
		action: "Open schedule",
		meta: [
			{ icon: "Truck", label: "Route 18" },
			{ icon: "MapPin", label: "San Antonio" },
			{ icon: "Clock", label: "Tomorrow" },
		],
	},
	{
		id: "QT-802",
		title: "Dealer Quote Follow-up",
		subtitle: "Margin approved, waiting for revised delivery estimate",
		status: "pending",
		tabs: ["Sales"],
		facets: {
			priority: "normal",
			owner: "Sales",
			window: "this week",
			workType: "sales",
		},
		amount: "$24,900",
		action: "Follow up",
		meta: [
			{ icon: "FileText", label: "Quote" },
			{ icon: "CircleDollarSign", label: "$24.9k" },
			{ icon: "User", label: "Dealer" },
		],
	},
	{
		id: "J-1056",
		title: "Cedar Park Cabinet Job",
		subtitle: "Measurements checked and ready for production scheduling",
		status: "ready",
		tabs: ["Calendar"],
		facets: {
			priority: "normal",
			owner: "Production",
			window: "this week",
			workType: "job",
		},
		action: "Schedule",
		meta: [
			{ icon: "Briefcase", label: "Job #1056" },
			{ icon: "ClipboardCheck", label: "Approved" },
			{ icon: "Calendar", label: "Schedule" },
		],
	},
	{
		id: "CS-144",
		title: "Service Ticket Review",
		subtitle: "Customer reported one missing trim piece after delivery",
		status: "blocked",
		tabs: ["Inbox"],
		facets: {
			priority: "high",
			owner: "Field",
			window: "today",
			workType: "service",
		},
		action: "Open ticket",
		meta: [
			{ icon: "TriangleAlert", label: "Service" },
			{ icon: "Truck", label: "Delivered" },
			{ icon: "MapPin", label: "Plano" },
		],
	},
	{
		id: "ADM-12",
		title: "Team coverage",
		subtitle: "Review today’s owner assignments and escalation coverage",
		status: "ready",
		tabs: ["More"],
		facets: {
			priority: "normal",
			owner: "Admin",
			window: "today",
			workType: "admin",
		},
		action: "Review coverage",
		meta: [
			{ icon: "User", label: "12 teammates" },
			{ icon: "Calendar", label: "Today" },
		],
	},
	{
		id: "SYS-04",
		title: "Operations preferences",
		subtitle: "Notification, queue, and mobile workspace settings",
		status: "complete",
		tabs: ["More"],
		facets: {
			priority: "normal",
			owner: "Admin",
			window: "this week",
			workType: "admin",
		},
		action: "Open settings",
		meta: [
			{ icon: "settings", label: "Workspace" },
			{ icon: "CheckCircle2", label: "Configured" },
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
		tabs: ["Home", "Pack"],
		facets: {
			assignment: "Warehouse",
			routeWindow: "morning",
			workType: "packing",
		},
		action: "Pack",
		detail: {
			items: ["6 left-hand doors", "6 right-hand doors", "2 hardware bins"],
			proof: ["Load photo required", "Hinge-side check pending"],
			activity: ["Pull list released at 7:05 AM"],
		},
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
		tabs: ["Home", "Route"],
		facets: {
			assignment: "My route",
			routeWindow: "morning",
			workType: "delivery",
		},
		action: "Start",
		detail: {
			stops: [
				"8:45 AM · North Ridge clubhouse",
				"10:15 AM · Customer delivery",
				"11:30 AM · Returns at Dock 2",
			],
			items: ["18 packed items", "3 stop packets", "1 return label"],
			proof: ["Signature required at stop 2", "Photos required at all stops"],
			activity: ["Route confirmed at 7:20 AM", "Vehicle check complete"],
		},
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
		tabs: ["Home", "Proof"],
		facets: {
			assignment: "My work",
			routeWindow: "afternoon",
			workType: "install",
		},
		action: "Review",
		detail: {
			items: ["7 installed cabinets", "3 trim pieces"],
			proof: ["8 photos uploaded", "Customer signature received"],
			activity: ["Checklist completed at 2:42 PM"],
		},
		meta: [
			{ icon: "Camera", label: "Photos" },
			{ icon: "CheckCircle2", label: "Checklist" },
		],
	},
	{
		id: "PK-224",
		title: "Load trim bundles",
		subtitle: "Dock 2 · scan four bundles before route release",
		status: "pending",
		tabs: ["Pack"],
		facets: {
			assignment: "Warehouse",
			routeWindow: "morning",
			workType: "packing",
		},
		action: "Scan items",
		meta: [
			{ icon: "Warehouse", label: "Dock 2" },
			{ icon: "ClipboardList", label: "4 bundles" },
		],
	},
	{
		id: "RT-11",
		title: "South Loop deliveries",
		subtitle: "Two scheduled stops, no returns",
		status: "ready",
		tabs: ["Route"],
		facets: {
			assignment: "Team route",
			routeWindow: "afternoon",
			workType: "delivery",
		},
		action: "View route",
		meta: [
			{ icon: "Truck", label: "Route 11" },
			{ icon: "Clock", label: "1:00 PM" },
		],
	},
	{
		id: "PF-52",
		title: "North Ridge proof review",
		subtitle: "Delivery photos complete; signature still required",
		status: "blocked",
		tabs: ["Proof"],
		facets: {
			assignment: "My route",
			routeWindow: "morning",
			workType: "delivery",
		},
		action: "Add signature",
		meta: [
			{ icon: "Camera", label: "6 photos" },
			{ icon: "TriangleAlert", label: "Signature" },
		],
	},
	{
		id: "ME-01",
		title: "Today’s shift",
		subtitle: "7:30 AM–4:00 PM · Driver and warehouse coverage",
		status: "ready",
		tabs: ["Me"],
		facets: {
			assignment: "My work",
			routeWindow: "today",
			workType: "profile",
		},
		action: "View shift",
		meta: [
			{ icon: "User", label: "M. Porter" },
			{ icon: "Clock", label: "7.5 hours" },
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
		tabs: ["Home", "Sales"],
		facets: {
			dateWindow: "this week",
			deliveryState: "production",
			documentType: "order",
			paymentState: "partial",
		},
		amount: "$12,840.00",
		action: "Open order",
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
		tabs: ["Home", "Sales", "Ship"],
		facets: {
			dateWindow: "this week",
			deliveryState: "ready",
			documentType: "order",
			paymentState: "paid",
		},
		amount: "$8,420.50",
		action: "Schedule delivery",
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
		tabs: ["Sales"],
		facets: {
			dateWindow: "this month",
			deliveryState: "not started",
			documentType: "quote",
			paymentState: "not due",
		},
		amount: "$21,300.00",
		action: "Review quote",
		meta: [
			{ icon: "FileText", label: "Quote" },
			{ icon: "TriangleAlert", label: "Review" },
			{ icon: "User", label: "Dealer" },
		],
	},
	{
		id: "PM-842",
		title: "Blue Oak payment",
		subtitle: "ACH deposit posted; final balance remains",
		status: "pending",
		tabs: ["Money"],
		facets: {
			dateWindow: "this week",
			deliveryState: "production",
			documentType: "payment",
			paymentState: "partial",
		},
		amount: "$6,420.00",
		action: "Review payment",
		meta: [
			{ icon: "CircleDollarSign", label: "ACH" },
			{ icon: "Clock", label: "Jul 22" },
			{ icon: "ReceiptText", label: "SO-4321" },
		],
	},
	{
		id: "PM-839",
		title: "Everline payment",
		subtitle: "Order balance paid in full",
		status: "complete",
		tabs: ["Money"],
		facets: {
			dateWindow: "this week",
			deliveryState: "ready",
			documentType: "payment",
			paymentState: "paid",
		},
		amount: "$8,420.50",
		action: "View receipt",
		meta: [
			{ icon: "CheckCircle2", label: "Paid" },
			{ icon: "Clock", label: "Jul 21" },
			{ icon: "ReceiptText", label: "SO-4319" },
		],
	},
	{
		id: "SH-219",
		title: "Everline delivery",
		subtitle: "Ready to assign a delivery window",
		status: "ready",
		tabs: ["Ship"],
		facets: {
			dateWindow: "this week",
			deliveryState: "ready",
			documentType: "shipment",
			paymentState: "paid",
		},
		action: "Assign window",
		meta: [
			{ icon: "Truck", label: "12 items" },
			{ icon: "MapPin", label: "Dallas" },
			{ icon: "Clock", label: "Unscheduled" },
		],
	},
	{
		id: "TOOL-1",
		title: "Sales reports",
		subtitle: "Revenue, aging, margin, and delivery summaries",
		status: "ready",
		tabs: ["More"],
		facets: {
			dateWindow: "this month",
			deliveryState: "all",
			documentType: "report",
			paymentState: "all",
		},
		action: "Open reports",
		meta: [
			{ icon: "ChartNoAxesColumn", label: "4 reports" },
			{ icon: "Calendar", label: "This month" },
		],
	},
	{
		id: "TOOL-2",
		title: "Ledger preferences",
		subtitle: "Default filters, notifications, and document views",
		status: "complete",
		tabs: ["More"],
		facets: {
			dateWindow: "this month",
			deliveryState: "all",
			documentType: "settings",
			paymentState: "all",
		},
		action: "Open preferences",
		meta: [
			{ icon: "settings", label: "Workspace" },
			{ icon: "CheckCircle2", label: "Configured" },
		],
	},
];
