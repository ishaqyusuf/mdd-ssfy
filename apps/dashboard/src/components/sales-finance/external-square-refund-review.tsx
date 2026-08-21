"use client";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ReviewRefund = RouterOutputs["salesRefunds"]["externalReview"][number];
type Components = { principal: string; ccc: string; tip: string };

const money = (cents: number) => formatCurrency.format(cents / 100);
const cents = (value: string) => Math.round(Number(value || 0) * 100);

export function ExternalSquareRefundReview() {
	const auth = useAuth();
	const trpc = useTRPC();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const query = useQuery(
		trpc.salesRefunds.externalReview.queryOptions(undefined, {
			enabled: Boolean(auth.can?.editRefundSquare),
			refetchInterval: 30_000,
		}),
	);
	if (!auth.can?.editRefundSquare) return null;
	const refunds = query.data || [];
	const selected = refunds.find((refund) => refund.id === selectedId) || null;

	return (
		<section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
					<div>
						<h2 className="font-semibold">External Square refunds</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Completed outside GND. Allocate them before invoice balances
							change.
						</p>
					</div>
				</div>
				<Badge variant="outline">{refunds.length} awaiting allocation</Badge>
			</div>
			{query.isPending ? (
				<div className="mt-4 h-16 animate-pulse rounded-lg bg-background/70" />
			) : query.isError ? (
				<p className="mt-4 text-sm text-destructive">{query.error.message}</p>
			) : refunds.length ? (
				<div className="mt-4 grid gap-3 lg:grid-cols-2">
					{refunds.map((refund) => (
						<button
							key={refund.id}
							type="button"
							className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/30"
							onClick={() => setSelectedId(refund.id)}
						>
							<div className="flex items-center justify-between gap-3">
								<span className="font-mono font-semibold">
									{money(refund.amountCents)}
								</span>
								<Badge variant="outline">{refund.providerStatus}</Badge>
							</div>
							<p className="mt-2 truncate text-sm">{refund.reason}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{refund.eligibleOrders.length
									? `${refund.eligibleOrders.length} verified order(s)`
									: "Tender relationship unresolved"}
							</p>
						</button>
					))}
				</div>
			) : (
				<p className="mt-4 rounded-lg bg-background/70 px-3 py-4 text-sm text-muted-foreground">
					No external Square refunds are waiting for allocation.
				</p>
			)}
			<ExternalAllocationSheet
				refund={selected}
				open={Boolean(selected)}
				onOpenChange={(open) => {
					if (!open) setSelectedId(null);
				}}
				onAllocated={async () => {
					setSelectedId(null);
					await query.refetch();
				}}
			/>
		</section>
	);
}

function ExternalAllocationSheet({
	refund,
	open,
	onOpenChange,
	onAllocated,
}: {
	refund: ReviewRefund | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAllocated: () => Promise<unknown>;
}) {
	const trpc = useTRPC();
	const [values, setValues] = useState<Record<number, Components>>({});
	useEffect(() => {
		if (!refund || !open) return;
		const firstId = refund.eligibleOrders[0]?.id;
		setValues(
			Object.fromEntries(
				refund.eligibleOrders.map((order) => [
					order.id,
					{
						principal:
							order.id === firstId
								? (refund.amountCents / 100).toFixed(2)
								: "0.00",
						ccc: "0.00",
						tip: "0.00",
					},
				]),
			),
		);
	}, [open, refund]);
	const allocatedCents = useMemo(
		() =>
			Object.values(values).reduce(
				(total, value) =>
					total + cents(value.principal) + cents(value.ccc) + cents(value.tip),
				0,
			),
		[values],
	);
	const allocate = useMutation(
		trpc.salesRefunds.allocateExternal.mutationOptions({
			async onSuccess() {
				toast.success("External refund allocated", {
					description:
						"The completed Square refund is queued for Finance and invoice application.",
				});
				await onAllocated();
			},
			onError(error) {
				toast.error("Allocation could not be applied", {
					description: error.message,
				});
			},
		}),
	);
	if (!refund) return null;
	const valid =
		refund.eligibleOrders.length > 0 && allocatedCents === refund.amountCents;

	function change(orderId: number, key: keyof Components, value: string) {
		setValues((current) => ({
			...current,
			[orderId]: {
				...(current[orderId] || {
					principal: "0.00",
					ccc: "0.00",
					tip: "0.00",
				}),
				[key]: value,
			},
		}));
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
				<SheetHeader className="border-b px-5 py-4 pr-12">
					<SheetTitle>Allocate external Square refund</SheetTitle>
					<SheetDescription>
						Classify {money(refund.amountCents)} among only the orders funded by
						the verified original tender.
					</SheetDescription>
				</SheetHeader>
				<div className="flex-1 space-y-4 overflow-y-auto p-5">
					{refund.eligibleOrders.length ? (
						refund.eligibleOrders.map((order) => {
							const value = values[order.id] || {
								principal: "0.00",
								ccc: "0.00",
								tip: "0.00",
							};
							return (
								<div key={order.id} className="rounded-xl border p-4">
									<div className="flex items-center justify-between gap-3">
										<p className="font-mono font-semibold">{order.orderNo}</p>
										<p className="text-xs text-muted-foreground">
											Invoice {money(order.grandTotalCents)}
										</p>
									</div>
									<div className="mt-3 grid grid-cols-3 gap-3">
										{(["principal", "ccc", "tip"] as const).map((key) => (
											<div key={key} className="space-y-1.5">
												<Label
													htmlFor={`${refund.id}-${order.id}-${key}`}
													className="capitalize"
												>
													{key === "ccc" ? "CCC" : key}
												</Label>
												<Input
													id={`${refund.id}-${order.id}-${key}`}
													inputMode="decimal"
													value={value[key]}
													onChange={(event) =>
														change(order.id, key, event.target.value)
													}
												/>
											</div>
										))}
									</div>
								</div>
							);
						})
					) : (
						<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
							The original tender cannot be tied uniquely to a GND Sales Order.
							This refund remains unresolved; GND will not guess an allocation.
						</div>
					)}
					<p
						className={
							valid ? "text-sm text-emerald-700" : "text-sm text-red-700"
						}
					>
						Allocated {money(allocatedCents)} of {money(refund.amountCents)}
					</p>
				</div>
				<SheetFooter className="border-t px-5 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!valid || allocate.isPending}
						onClick={() =>
							allocate.mutate({
								refundId: refund.id,
								allocations: refund.eligibleOrders
									.map((order) => ({
										salesOrderId: order.id,
										principalCents: cents(values[order.id]?.principal || "0"),
										cccCents: cents(values[order.id]?.ccc || "0"),
										tipCents: cents(values[order.id]?.tip || "0"),
									}))
									.filter(
										(item) =>
											item.principalCents || item.cccCents || item.tipCents,
									),
							})
						}
					>
						{allocate.isPending ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						Approve allocation
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
