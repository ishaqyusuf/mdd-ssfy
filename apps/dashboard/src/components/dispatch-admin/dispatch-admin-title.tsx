"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Button } from "@gnd/ui/button";
import { Plus } from "lucide-react";

export function DispatchAdminTitle() {
	const { setFilters } = useDispatchFilterParams();
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
				<p className="text-sm text-muted-foreground">
					Plan, pack, assign, and complete customer deliveries.
				</p>
			</div>
			<Button
				onClick={() =>
					setFilters({
						sheetMode: "create",
						dispatchId: null,
					})
				}
			>
				<Plus data-icon="inline-start" />
				Create dispatch
			</Button>
		</div>
	);
}
