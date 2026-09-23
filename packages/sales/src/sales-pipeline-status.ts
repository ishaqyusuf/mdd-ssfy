export const SALES_PIPELINE_HEADLINE_CODES = [
	"awaiting_production",
	"production_queued",
	"in_production",
	"awaiting_production_review",
	"ready_to_fulfill",
	"fulfillment_queued",
	"packing",
	"packed",
	"in_transit",
	"partially_fulfilled",
	"administratively_completed",
	"fulfilled",
	"cancelled",
	"conflict",
	"unknown",
] as const;

export type SalesPipelineHeadlineCode =
	(typeof SALES_PIPELINE_HEADLINE_CODES)[number];

export const SALES_PIPELINE_HEADLINE_META: Record<
	SalesPipelineHeadlineCode,
	{ label: string; tone: string }
> = {
	cancelled: { label: "Cancelled", tone: "rose" },
	conflict: { label: "Lifecycle conflict", tone: "rose" },
	awaiting_production: { label: "Awaiting production", tone: "slate" },
	production_queued: { label: "Production queued", tone: "amber" },
	in_production: { label: "In production", tone: "blue" },
	awaiting_production_review: {
		label: "Awaiting production review",
		tone: "amber",
	},
	ready_to_fulfill: { label: "Ready to fulfill", tone: "violet" },
	fulfillment_queued: { label: "Fulfillment queued", tone: "indigo" },
	packing: { label: "Packing", tone: "cyan" },
	packed: { label: "Packed", tone: "teal" },
	in_transit: { label: "In transit", tone: "sky" },
	partially_fulfilled: { label: "Partially fulfilled", tone: "sky" },
	administratively_completed: {
		label: "Completed",
		tone: "emerald",
	},
	fulfilled: { label: "Completed", tone: "emerald" },
	unknown: { label: "Status unavailable", tone: "stone" },
};
