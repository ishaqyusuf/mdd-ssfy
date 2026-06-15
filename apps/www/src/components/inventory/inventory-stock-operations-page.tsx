"use client";

import type { RouterInputs } from "@api/trpc/routers/_app";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { Badge } from "@gnd/ui/badge";

type StockAdjustmentInput = RouterInputs["inventories"]["adjustInventoryStock"];
type StockAdjustmentReason = StockAdjustmentInput["reason"];
type StockAdjustmentMode = NonNullable<StockAdjustmentInput["mode"]>;

const reasonOptions: Array<{ label: string; value: StockAdjustmentReason }> = [
	{ label: "Correction", value: "correction" },
	{ label: "Cycle Count", value: "cycle_count" },
	{ label: "Damage", value: "damage" },
	{ label: "Return", value: "return" },
	{ label: "Consume", value: "consume" },
	{ label: "Release", value: "release" },
	{ label: "Stock In", value: "stock_in" },
	{ label: "Stock Out", value: "stock_out" },
];

function auditStatusVariant(status?: string | null) {
	if (status === "verified") return "default";
	if (status === "partial") return "secondary";
	return "outline";
}

function nullableNumber(value: string) {
	if (!value.trim()) return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function requiredNumber(value: string) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function InventoryStockOperationsPage() {
	const trpc = useTRPC();
	const [inventoryVariantId, setInventoryVariantId] = useState("");
	const [inventoryStockId, setInventoryStockId] = useState("");
	const [supplierId, setSupplierId] = useState("");
	const [location, setLocation] = useState("");
	const [unitPrice, setUnitPrice] = useState("");
	const [qty, setQty] = useState("");
	const [mode, setMode] = useState<StockAdjustmentMode>("delta");
	const [reason, setReason] = useState<StockAdjustmentReason>("correction");
	const [reference, setReference] = useState("");
	const [notes, setNotes] = useState("");
	const auditReport = useQuery(
		trpc.inventories.stockAuditVerificationReport.queryOptions(undefined),
	);

	const adjustment = useMutation(
		trpc.inventories.adjustInventoryStock.mutationOptions({
			onSuccess(data) {
				toast({
					title: "Stock adjusted",
					description: `Stock ${data.inventoryStockId}: ${data.previousQty} to ${data.currentQty}.`,
					variant: "success",
				});
			},
		}),
	);

	const submitAdjustment = () => {
		const variantId = requiredNumber(inventoryVariantId);
		const quantity = requiredNumber(qty);

		if (!variantId || quantity == null) {
			toast({
				title: "Missing adjustment details",
				description: "Inventory variant ID and quantity are required.",
				variant: "destructive",
			});
			return;
		}

		adjustment.mutate({
			inventoryVariantId: variantId,
			inventoryStockId: nullableNumber(inventoryStockId),
			supplierId: nullableNumber(supplierId),
			location: location || null,
			unitPrice: nullableNumber(unitPrice),
			qty: quantity,
			mode,
			reason,
			reference: reference || null,
			notes: notes || null,
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Stock Operations</h2>
				<p className="max-w-3xl text-sm text-muted-foreground">
					Post manual stock adjustments with movement and inventory-log audit
					records.
				</p>
			</div>

			<Card className="p-4">
				<div className="grid gap-4 lg:grid-cols-3">
					<div className="space-y-2">
						<label className="text-sm font-medium">Inventory Variant ID</label>
						<Input
							inputMode="numeric"
							value={inventoryVariantId}
							onChange={(event) => setInventoryVariantId(event.target.value)}
							placeholder="Required"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Inventory Stock ID</label>
						<Input
							inputMode="numeric"
							value={inventoryStockId}
							onChange={(event) => setInventoryStockId(event.target.value)}
							placeholder="Optional existing stock row"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Supplier ID</label>
						<Input
							inputMode="numeric"
							value={supplierId}
							onChange={(event) => setSupplierId(event.target.value)}
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Mode</label>
						<Select
							value={mode}
							onValueChange={(value) => setMode(value as StockAdjustmentMode)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="delta">Delta</SelectItem>
								<SelectItem value="set">Set Count</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Quantity</label>
						<Input
							inputMode="decimal"
							value={qty}
							onChange={(event) => setQty(event.target.value)}
							placeholder={mode === "set" ? "New counted qty" : "Change qty"}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Reason</label>
						<Select
							value={reason}
							onValueChange={(value) =>
								setReason(value as StockAdjustmentReason)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{reasonOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Location</label>
						<Input
							value={location}
							onChange={(event) => setLocation(event.target.value)}
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Unit Price</label>
						<Input
							inputMode="decimal"
							value={unitPrice}
							onChange={(event) => setUnitPrice(event.target.value)}
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Reference</label>
						<Input
							value={reference}
							onChange={(event) => setReference(event.target.value)}
							placeholder="Cycle count, return, correction"
						/>
					</div>
					<div className="space-y-2 lg:col-span-3">
						<label className="text-sm font-medium">Notes</label>
						<Textarea
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Reason details"
						/>
					</div>
				</div>

				<div className="mt-4 flex items-center justify-between gap-3">
					<div className="text-sm text-muted-foreground">
						{adjustment.data
							? `Movement ${adjustment.data.movementId} / Log ${adjustment.data.logId}`
							: "Adjustments update physical stock and write audit records."}
					</div>
					<Button
						type="button"
						onClick={submitAdjustment}
						disabled={adjustment.isPending}
					>
						{adjustment.isPending ? "Posting..." : "Post Adjustment"}
					</Button>
				</div>
			</Card>

			<Card className="p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h3 className="text-base font-semibold">Audit Verification</h3>
						<div className="text-sm text-muted-foreground">
							{auditReport.data
								? `${auditReport.data.summary.verifiedCategories} of ${auditReport.data.summary.totalCategories} categories verified in recent audit rows.`
								: "Checking recent stock movement and inventory log rows."}
						</div>
					</div>
					{auditReport.data ? (
						<div className="flex flex-wrap gap-2 text-sm">
							<Badge variant="outline">
								{auditReport.data.summary.movementCount} movements
							</Badge>
							<Badge variant="outline">
								{auditReport.data.summary.logCount} logs
							</Badge>
						</div>
					) : null}
				</div>

				<div className="mt-4 overflow-hidden rounded-md border">
					{auditReport.data?.rows.map((row) => (
						<div
							key={row.category}
							className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_auto]"
						>
							<div>
								<div className="font-medium capitalize">
									{row.category.replaceAll("_", " ")}
								</div>
								<div className="text-xs text-muted-foreground">
									Reason: {row.reason}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Movement
								</div>
								<div>
									{row.movementCount} / {row.expectedMovementTypes.join(", ")}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Log
								</div>
								<div>{row.logCount} / {row.expectedLogActions.join(", ")}</div>
							</div>
							<div className="md:text-right">
								<Badge
									variant={auditStatusVariant(row.status)}
									className="capitalize"
								>
									{row.status.replaceAll("_", " ")}
								</Badge>
							</div>
						</div>
					))}
					{auditReport.isLoading ? (
						<div className="p-4 text-sm text-muted-foreground">
							Loading audit verification...
						</div>
					) : null}
				</div>
			</Card>
		</div>
	);
}
