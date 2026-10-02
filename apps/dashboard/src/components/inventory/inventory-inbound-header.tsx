"use client";
import { OpenGeneralInboundSheet } from "@/components/open-general-inbound-sheet";
import { InventoryInboundsColumnVisibility } from "@/components/tables-2/inventory-inbounds/column-visibility";
import { useInventoryInboundFilterParams } from "@/hooks/use-inventory-inbound-filter-params";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useInboundReceiving } from "./inbound-receiving-context";
export function InventoryInboundHeader() {
	const { shipmentSummary, setParams } = useInboundReceiving();
	const { filters, setFilters } = useInventoryInboundFilterParams();
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 className="font-medium">Inbound shipments</h2>
				<p className="text-sm text-muted-foreground">
					{shipmentSummary.total} loaded · {shipmentSummary.active} active
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Input
					className="w-full sm:w-56"
					aria-label="Search inbound shipments"
					placeholder="Reference, supplier or number"
					value={filters.inboundSearch || ""}
					onChange={(e) =>
						setFilters({ inboundSearch: e.target.value || null })
					}
				/>
				<Select
					value={filters.inboundStatus || "all"}
					onValueChange={(value) =>
						setFilters({
							inboundStatus:
								value === "all"
									? null
									: (value as NonNullable<typeof filters.inboundStatus>),
						})
					}
				>
					<SelectTrigger className="w-40" aria-label="Inbound status">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{[
							"all",
							"pending",
							"in_progress",
							"completed",
							"issue_open",
							"closed",
							"cancelled",
						].map((status) => (
							<SelectItem key={status} value={status}>
								{status === "all"
									? "All statuses"
									: status.replaceAll("_", " ")}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{filters.inboundSearch || filters.inboundStatus ? (
					<Button
						variant="ghost"
						onClick={() =>
							setFilters({ inboundSearch: null, inboundStatus: null })
						}
					>
						Clear filters
					</Button>
				) : null}
				<InventoryInboundsColumnVisibility />
				<Button
					variant="outline"
					onClick={() => setParams({ inboundQueue: true })}
				>
					Demand queue
				</Button>
				<OpenGeneralInboundSheet />
			</div>
		</div>
	);
}
