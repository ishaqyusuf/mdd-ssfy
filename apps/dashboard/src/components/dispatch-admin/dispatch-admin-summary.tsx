"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useFulfillmentOrdersOptions } from "@/hooks/use-fulfillment-orders";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

export function DispatchAdminSummary({
	showOverdueAlert = false,
}: {
	showOverdueAlert?: boolean;
}) {
	const orders = useSuspenseInfiniteQuery(useFulfillmentOrdersOptions());
	const orderSummary = orders.data.pages[0]!;
	const { setFilters } = useDispatchFilterParams();

	if (!showOverdueAlert || orderSummary.counts.pastDue === 0) return null;

	return (
		<Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
			<AlertTriangle className="text-amber-700 dark:text-amber-300" />
			<AlertTitle>
				{orderSummary.counts.pastDue} orders with overdue fulfillments
			</AlertTitle>
			<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
				<span>
					Review schedules or resolve the blockers holding these trips.
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						setFilters({
							section: "dispatches",
							risks: ["overdue"],
						})
					}
				>
					Review overdue
				</Button>
			</AlertDescription>
		</Alert>
	);
}

export function DispatchAdminSummarySkeleton() {
	return null;
}
