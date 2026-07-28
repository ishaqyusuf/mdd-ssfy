import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusInfo,
} from "@gnd/sales/order-status";
import { cn, cva } from "@gnd/ui/cn";

type LifecycleQtySnapshot = {
	total?: number | string | null;
	qty?: number | string | null;
};

type SalesOverviewStatusInput = {
	type?: string | null;
	isQuote?: boolean | null;
	orderStatus?: string | null;
	prodStatus?: string | null;
	deliveryStatus?: string | null;
	invoice?: {
		total?: number | null;
		pending?: number | null;
	} | null;
	status?: {
		assignment?: {
			status?: string | null;
		} | null;
		production?: {
			status?: string | null;
		} | null;
		delivery?: {
			status?: string | null;
		} | null;
	} | null;
	control?: {
		productionStatus?: string | null;
		dispatchStatus?: string | null;
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	} | null;
	statistic?: {
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	} | null;
};

type QuoteStatus = "quote_open" | "quote_part_paid" | "quote_paid";

export const salesOverviewDocumentStatusVariants = cva(
	"w-fit whitespace-nowrap",
	{
		variants: {
			status: {
				awaiting_production: "border-0 bg-slate-100 text-slate-700",
				production_queued: "border-0 bg-amber-100 text-amber-700",
				in_production: "border-0 bg-blue-100 text-blue-700",
				ready_to_fulfill: "border-0 bg-violet-100 text-violet-700",
				fulfillment_queued: "border-0 bg-indigo-100 text-indigo-700",
				packing: "border-0 bg-cyan-100 text-cyan-700",
				packed: "border-0 bg-teal-100 text-teal-700",
				in_transit: "border-0 bg-sky-100 text-sky-700",
				fulfilled: "border-0 bg-emerald-100 text-emerald-700",
				cancelled: "border-0 bg-rose-100 text-rose-700",
				unknown: "border-0 bg-stone-100 text-stone-700",
				quote_open:
					"rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700",
				quote_part_paid:
					"rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700",
				quote_paid:
					"rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700",
			} satisfies Record<SalesOrderLifecycleStatus | QuoteStatus, string>,
		},
		defaultVariants: {
			status: "unknown",
		},
	},
);

function getQuoteStatus(data: SalesOverviewStatusInput): {
	label: string;
	status: QuoteStatus;
} {
	const pending = Number(data.invoice?.pending || 0);
	const total = Number(data.invoice?.total || 0);

	if (pending <= 0) {
		return { label: "Paid", status: "quote_paid" };
	}

	if (pending >= total) {
		return { label: "Open", status: "quote_open" };
	}

	return { label: "Part paid", status: "quote_part_paid" };
}

export function getSalesOverviewDocumentStatus(
	data: SalesOverviewStatusInput | null | undefined,
) {
	if (data?.type === "quote" || data?.isQuote) {
		const quoteStatus = getQuoteStatus(data);

		return {
			label: quoteStatus.label,
			labelText: "Quote Status",
			className: cn(
				salesOverviewDocumentStatusVariants({
					status: quoteStatus.status,
				}),
			),
		};
	}

	const control = data?.control;
	const statistic = data?.statistic;
	const productionStatus =
		control?.productionStatus && control.productionStatus !== "unknown"
			? control.productionStatus
			: data?.status?.production?.status;
	const assignmentStatus = data?.status?.assignment?.status;
	const legacyProductionStatus =
		data?.prodStatus ||
		(assignmentStatus === "in progress" || assignmentStatus === "completed"
			? "assigned"
			: undefined);
	const fulfillmentStatus =
		control?.dispatchStatus && control.dispatchStatus !== "unknown"
			? control.dispatchStatus
			: data?.deliveryStatus || data?.status?.delivery?.status;
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: data?.orderStatus,
		legacyProductionStatus,
		productionStatus,
		fulfillmentStatus,
		hasProductionWork: productionStatus === "N/A" ? false : undefined,
		packed: control?.packed || statistic?.packed,
		pendingPacking: control?.pendingPacking || statistic?.pendingPacking,
		pendingDispatch: control?.pendingDispatch || statistic?.pendingDispatch,
		packables: control?.packables || statistic?.packables,
	});

	return {
		label: lifecycleStatus.label,
		labelText: "Order Status",
		className: cn(
			salesOverviewDocumentStatusVariants({
				status: lifecycleStatus.status,
			}),
		),
	};
}
