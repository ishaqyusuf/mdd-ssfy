import type { IconKeys } from "@/components/ui/icon";
import type { PreviewRecord } from "../data/sample-data";

export type PreviewDetailMode = "ops" | "field" | "sales";

export type PreviewDetailContent = {
	title: string;
	description: string;
	rows: { icon: IconKeys; label: string; value: string }[];
};

export function getPreviewDetailContent(
	record: PreviewRecord,
	mode: PreviewDetailMode,
	tab: string,
): PreviewDetailContent {
	const status = titleCase(record.status);
	const owner =
		record.facets.owner ||
		record.facets.assignment ||
		(mode === "sales" ? "Sales team" : "Assigned team");
	const window =
		record.facets.window ||
		record.facets.routeWindow ||
		record.facets.dateWindow ||
		"Current";
	const activity = record.detail?.activity || [
		`${record.id} entered ${record.status} status`,
		`${owner} owns the next review`,
	];

	if (tab === "Overview") {
		return {
			title: "At a glance",
			description:
				"Current operational context and the next safe action for this preview record.",
			rows: [
				{ icon: "ClipboardList", label: "Reference", value: record.id },
				{ icon: "User", label: "Owner", value: owner },
				{ icon: "Clock", label: "Window", value: titleCase(window) },
				{
					icon: "CheckCircle2",
					label: "Next action",
					value: record.action || `Review ${status.toLowerCase()} work`,
				},
			],
		};
	}

	if (tab === "Timeline" || tab === "Activity") {
		return {
			title: tab === "Timeline" ? "Operational timeline" : "Recent activity",
			description: "Static preview events ordered from newest to oldest.",
			rows: activity.map((value, index) => ({
				icon: index === 0 ? "Clock" : "CheckCircle2",
				label: index === 0 ? "Latest" : `Earlier ${index}`,
				value,
			})),
		};
	}

	if (tab === "Checklist") {
		const complete = record.status === "complete";
		return {
			title: "Completion checklist",
			description:
				"Required checks stay visible before the work can leave the queue.",
			rows: [
				{
					icon: "ClipboardCheck",
					label: "Scope reviewed",
					value: "Complete",
				},
				{
					icon: complete ? "CheckCircle2" : "Clock",
					label: "Owner confirmation",
					value: complete ? "Complete" : "Pending",
				},
				{
					icon: record.status === "blocked" ? "TriangleAlert" : "Camera",
					label: "Closeout evidence",
					value:
						record.status === "blocked"
							? "Blocked by an open issue"
							: "Ready for review",
				},
			],
		};
	}

	if (tab === "Notes") {
		return {
			title: "Notes and documents",
			description:
				"Context stays attached to the selected record in this static preview.",
			rows: [
				{ icon: "FileText", label: "Work note", value: record.subtitle },
				{
					icon: "User",
					label: "Visibility",
					value: `${owner} workspace`,
				},
				{
					icon: "ClipboardList",
					label: "Documents",
					value: `${Math.max(1, record.meta.length - 1)} linked previews`,
				},
			],
		};
	}

	if (tab === "Actions") {
		return {
			title: "Available actions",
			description:
				"These controls demonstrate hierarchy only; preview mode never writes live data.",
			rows: [
				{
					icon: "CheckCircle2",
					label: "Primary",
					value: record.action || "Review work",
				},
				{ icon: "FileText", label: "Follow-up", value: "Add internal note" },
				{
					icon: "TriangleAlert",
					label: "Escalation",
					value: "Send to owning team",
				},
			],
		};
	}

	if (tab === "Stops") {
		const stops = record.detail?.stops || [
			"No route stops are attached to this work item.",
		];
		return listContent("Route stops", "Planned stops in route order.", stops, [
			"MapPin",
			"Truck",
			"Clock",
		]);
	}

	if (tab === "Items") {
		const items = record.detail?.items || [
			...record.meta.map((item) => item.label),
			"Final quantity check required",
		];
		return listContent(
			mode === "sales" ? "Order items" : "Work items",
			"Compact item evidence for the selected record.",
			items,
			["ClipboardList", "Briefcase", "CheckCircle2"],
		);
	}

	if (tab === "Proof") {
		const proof = record.detail?.proof || [
			"Photo evidence not yet attached",
			"Signature requirement follows work status",
		];
		return listContent(
			"Proof and signatures",
			"Required field evidence is visible before closeout.",
			proof,
			["Camera", "FileText", "CheckCircle2"],
		);
	}

	if (tab === "Payments") {
		return {
			title: "Payment ledger",
			description: "Financial status stays separate from fulfillment progress.",
			rows: [
				{
					icon: "CircleDollarSign",
					label: "Document value",
					value: record.amount || "No amount",
				},
				{
					icon: "ReceiptText",
					label: "Payment state",
					value: titleCase(record.facets.paymentState || "Review"),
				},
				{
					icon: "Clock",
					label: "Date window",
					value: titleCase(record.facets.dateWindow || "Current"),
				},
			],
		};
	}

	if (tab === "Fulfillment") {
		return {
			title: "Fulfillment",
			description:
				"Production and delivery are shown without changing live order state.",
			rows: [
				{
					icon: "HardHat",
					label: "Current state",
					value: titleCase(record.facets.deliveryState || record.status),
				},
				{
					icon: "Truck",
					label: "Next movement",
					value:
						record.action ||
						(record.status === "ready"
							? "Schedule delivery"
							: "Continue production"),
				},
				{
					icon: "MapPin",
					label: "Destination",
					value:
						record.meta.find((item) => item.icon === "MapPin")?.label ||
						"Confirm with customer",
				},
			],
		};
	}

	return {
		title: `${tab} summary`,
		description:
			"Supporting context remains attached to this static preview record.",
		rows: record.meta.map((item, index) => ({
			icon: item.icon,
			label: `Context ${index + 1}`,
			value: item.label,
		})),
	};
}

function listContent(
	title: string,
	description: string,
	values: string[],
	icons: IconKeys[],
): PreviewDetailContent {
	return {
		title,
		description,
		rows: values.map((value, index) => ({
			icon: icons[index % icons.length] || "ClipboardList",
			label: `${index + 1}`,
			value,
		})),
	};
}

function titleCase(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}
