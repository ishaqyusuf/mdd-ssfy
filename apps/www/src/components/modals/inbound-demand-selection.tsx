import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";

import {
	type InboundDemandDisplayMetadata,
	resolveInboundDemandDisplay,
} from "./inbound-demand-display";
import {
	getPromptMutableDemandIds,
	isPromptMutableDemand,
} from "./inbound-demand-selection-state";

type InboundDemandRow =
	RouterOutputs["inventories"]["inboundDemandQueue"][number];

type InboundDemandSelectionProps = {
	rows: InboundDemandRow[];
	selectedStatus: string | null | undefined;
	selectedDemandIds: number[];
	displayByDemandId: ReadonlyMap<number, InboundDemandDisplayMetadata>;
	onSelectionChange: (demandId: number, checked: boolean) => void;
	onMarkAll: () => void;
};

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

export function InboundDemandSelection({
	rows,
	selectedStatus,
	selectedDemandIds,
	displayByDemandId,
	onSelectionChange,
	onMarkAll,
}: InboundDemandSelectionProps) {
	if (!rows.length) return null;
	const mutableDemandIds = getPromptMutableDemandIds(rows, selectedStatus);
	const allMutableDemandSelected =
		mutableDemandIds.length > 0 &&
		mutableDemandIds.every((demandId) => selectedDemandIds.includes(demandId));

	return (
		<div className="rounded-md border border-border bg-card">
			<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
				<div>
					<div className="text-sm font-medium">Inventory demand</div>
					<div className="text-xs text-muted-foreground">
						Mapped shortage demand for this order.
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!mutableDemandIds.length || allMutableDemandSelected}
						onClick={onMarkAll}
					>
						Mark all
					</Button>
					<Badge variant="outline">{selectedDemandIds.length} selected</Badge>
				</div>
			</div>
			<div className="max-h-56 divide-y divide-border overflow-auto">
				{rows.map((demand) => {
					const isSelectable = isPromptMutableDemand(demand, selectedStatus);
					const checked = selectedDemandIds.includes(demand.id);
					const display = resolveInboundDemandDisplay(
						demand,
						displayByDemandId,
					);
					const qtyOpen = Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					);
					const checkboxId = `inbound-demand-${demand.id}`;

					return (
						<div
							key={demand.id}
							className="flex min-h-16 items-start gap-3 px-3 py-2"
						>
							<Checkbox
								id={checkboxId}
								className="mt-1"
								checked={checked}
								disabled={!isSelectable}
								onCheckedChange={(value) =>
									onSelectionChange(demand.id, !!value)
								}
							/>
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex items-center gap-2">
									<label
										htmlFor={checkboxId}
										className="truncate text-sm font-medium"
									>
										{display.title}
									</label>
									<Badge variant="outline" className="shrink-0 capitalize">
										{demand.status?.replaceAll("_", " ") || "unknown"}
									</Badge>
								</div>
								{display.subtitle ? (
									<div className="text-xs text-muted-foreground">
										{display.subtitle}
									</div>
								) : null}
								<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
									<span>Open {formatQty(qtyOpen)}</span>
									<span>Received {formatQty(demand.qtyReceived)}</span>
									{demand.inboundShipmentItemId ? (
										<span>Linked inbound #{demand.inboundShipmentItemId}</span>
									) : null}
								</div>
								{!isSelectable ? (
									<div className="text-xs text-muted-foreground">
										Linked or received demand.
									</div>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
