"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";

type Detail = RouterOutputs["dispatch"]["detail"];

export function DispatchSheetHeader({ detail }: { detail?: Detail }) {
	const { filters } = useDispatchFilterParams();
	const dispatch = detail?.overview.dispatch;
	const order = detail?.overview.order;
	const title =
		filters.sheetMode === "create"
			? "Create dispatch"
			: filters.sheetMode === "assign"
				? "Assign driver"
				: filters.sheetMode === "schedule"
					? "Schedule dispatch"
					: filters.sheetMode === "exception"
						? "Report exception"
						: filters.sheetMode === "resolve"
							? "Resolve exception"
							: order?.orderId
								? `Dispatch ${order.orderId}`
								: "Dispatch details";
	return (
		<SheetHeader className="border-b px-5 py-4 text-left">
			<div className="flex items-center gap-2">
				<SheetTitle>{title}</SheetTitle>
				{dispatch?.status ? (
					<Badge variant="outline">{dispatch.status}</Badge>
				) : null}
			</div>
			<SheetDescription>
				{order?.orderId
					? `${order.orderId} · ${order.customer?.businessName || order.customer?.name || "Customer"}`
					: "Create and manage one inventory-backed customer trip."}
			</SheetDescription>
		</SheetHeader>
	);
}
