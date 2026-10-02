"use client";

import {
	formatInventoryDateInputValue,
	formatInventoryExpectedDateLabel,
	getDefaultInventoryExpectedDateValue,
} from "@/components/sales-overview-system/lib/inventory-display";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useId, useState } from "react";
import { summarizeInventoryNeed } from "./need-summary";

type Plan = RouterOutputs["inventories"]["salesFormStockPlan"];
export function NeedInboundForm({
	plan,
	orderNumber,
	refreshPlan,
	onCreated,
}: {
	plan: Plan;
	orderNumber: string;
	refreshPlan: () => Promise<Plan | undefined>;
	onCreated: () => Promise<void>;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const id = useId();
	const [supplierId, setSupplierId] = useState("none");
	const [expectedAt, setExpectedAt] = useState(
		getDefaultInventoryExpectedDateValue,
	);
	const [checking, setChecking] = useState(false);
	const suppliers = useQuery(trpc.inventories.inboundSuppliers.queryOptions());
	const summary = summarizeInventoryNeed(plan.rows);
	const mutation = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess: async () => {
				await onCreated();
				toast({
					title: "Inbound created for this shortage",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to create inbound",
					description: error.message,
					variant: "destructive",
				});
				void refreshPlan().catch(() => undefined);
			},
		}),
	);
	const busy = mutation.isPending || checking;
	return (
		<form
			className="space-y-5"
			onSubmit={async (event) => {
				event.preventDefault();
				if (
					busy ||
					!auth.can.editInboundOrder ||
					!plan.canApply ||
					summary.apply > 0 ||
					summary.shortage <= 0
				)
					return;
				setChecking(true);
				try {
					const fresh = await refreshPlan();
					if (!fresh || fresh.revision !== plan.revision) {
						toast({
							title: "Inventory changed",
							description: "Review the refreshed shortage and confirm again.",
						});
						return;
					}
					mutation.mutate({
						operation: "create_inbound",
						supplierId: supplierId === "none" ? null : Number(supplierId),
						reference: orderNumber,
						expectedAt: expectedAt ? new Date(`${expectedAt}T00:00:00`) : null,
						componentSelections: fresh.rows
							.filter(
								(row) =>
									row.shortage > 0 &&
									!row.mappingIssue &&
									row.inventoryVariantId,
							)
							.map((row) => ({
								lineItemComponentIds: [row.componentId],
								qty: row.shortage,
							})),
					});
				} catch (error) {
					toast({
						title: "Unable to check the shortage",
						description:
							error instanceof Error ? error.message : "Refresh and try again.",
						variant: "destructive",
					});
				} finally {
					setChecking(false);
				}
			}}
		>
			<p className="text-sm text-muted-foreground">
				Order{" "}
				<strong className="text-foreground">{summary.shortage} pieces</strong>{" "}
				for this need. Existing inbound is already accounted for.
			</p>
			<div className="space-y-2">
				<Label htmlFor={`${id}-reference`}>Order reference</Label>
				<Input id={`${id}-reference`} value={orderNumber} readOnly />
			</div>
			<div className="space-y-2">
				<Label htmlFor={`${id}-supplier`}>Supplier</Label>
				<Select
					value={supplierId}
					onValueChange={(value) => value && setSupplierId(value)}
					disabled={busy}
				>
					<SelectTrigger id={`${id}-supplier`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">No supplier</SelectItem>
						{suppliers.data?.map((supplier) => (
							<SelectItem key={supplier.id} value={String(supplier.id)}>
								{supplier.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{suppliers.isError ? (
				<div role="alert">
					<p className="text-sm">Unable to load suppliers.</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => suppliers.refetch()}
					>
						Retry
					</Button>
				</div>
			) : null}
			<div className="space-y-2">
				<Label htmlFor={`${id}-expected`}>Expected date</Label>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							id={`${id}-expected`}
							variant="outline"
							className="w-full justify-start"
							disabled={busy}
						>
							{formatInventoryExpectedDateLabel(expectedAt)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={
								expectedAt ? new Date(`${expectedAt}T00:00:00`) : undefined
							}
							onSelect={(date) =>
								setExpectedAt(date ? formatInventoryDateInputValue(date) : "")
							}
						/>
					</PopoverContent>
				</Popover>
			</div>
			<Button
				className="w-full"
				disabled={
					busy ||
					!auth.can.editInboundOrder ||
					!plan.canApply ||
					summary.apply > 0 ||
					summary.shortage <= 0 ||
					suppliers.isPending ||
					suppliers.isError
				}
			>
				{busy ? "Creating…" : `Create inbound · ${summary.shortage} pieces`}
			</Button>
		</form>
	);
}
