"use client";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { useState } from "react";
import { useInboundReceiving } from "./inbound-receiving-context";

export function InboundDemandAssignment({ inboundId }: { inboundId: number }) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const {
		demandQueue,
		demandQueueQuery,
		selectedDemandIds,
		setSelectedDemandIds,
		assignDemandsMutation,
	} = useInboundReceiving();
	const eligible = demandQueue.filter((row) => !row.inboundShipmentItemId);
	const visible = eligible.filter((row) =>
		`${row.inventoryVariant.inventory.name} ${row.inventoryVariant.sku || row.inventoryVariant.uid} ${row.lineItemComponent.parent.sale?.orderId || ""}`
			.toLowerCase()
			.includes(search.trim().toLowerCase()),
	);
	const selected = selectedDemandIds.filter((id) =>
		eligible.some((row) => row.id === id),
	);
	return (
		<section className="space-y-3 border-t pt-5">
			<Button
				variant="outline"
				onClick={() => setOpen(!open)}
				aria-expanded={open}
			>
				Link shortage orders
			</Button>
			{open ? (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Select unassigned shortage needs to add to this shipment.
					</p>
					<Input
						aria-label="Search shortage needs"
						placeholder="Inventory, SKU or order"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					<div className="max-h-64 overflow-y-auto">
						{demandQueueQuery.isPending ? (
							<p>Loading shortage needs…</p>
						) : demandQueueQuery.isError ? (
							<div role="alert">
								<p>{demandQueueQuery.error.message}</p>
								<Button
									variant="outline"
									onClick={() => demandQueueQuery.refetch()}
								>
									Retry
								</Button>
							</div>
						) : !eligible.length ? (
							<p>No unassigned shortage needs.</p>
						) : (
							visible.map((row) => (
								<label
									key={row.id}
									className="flex items-start gap-3 border-b py-3"
								>
									<input
										type="checkbox"
										disabled={assignDemandsMutation.isPending}
										checked={selected.includes(row.id)}
										onChange={(event) =>
											setSelectedDemandIds((current) =>
												event.target.checked
													? [...current, row.id]
													: current.filter((id) => id !== row.id),
											)
										}
									/>
									<span className="text-sm">
										{row.inventoryVariant.inventory.name} ·{" "}
										{row.inventoryVariant.sku || row.inventoryVariant.uid} ·
										Order{" "}
										{row.lineItemComponent.parent.sale?.orderId || "unassigned"}{" "}
										· Need {Number(row.qty) - Number(row.qtyReceived || 0)}
									</span>
								</label>
							))
						)}
						{eligible.length > 0 && !visible.length ? (
							<p>No shortage needs match this search.</p>
						) : null}
					</div>
					{assignDemandsMutation.isError ? (
						<p role="alert">{assignDemandsMutation.error.message}</p>
					) : null}
					<Button
						disabled={
							!selected.length ||
							assignDemandsMutation.isPending ||
							demandQueueQuery.isError
						}
						onClick={() =>
							assignDemandsMutation.mutate({ inboundId, demandIds: selected })
						}
					>
						Assign Selected Orders
					</Button>
				</div>
			) : null}
		</section>
	);
}
