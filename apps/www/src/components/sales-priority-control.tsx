"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	SALES_PRIORITY_OPTIONS,
	getSalesPriorityLabel,
	normalizeSalesPriority,
	type SalesPriorityValue,
} from "@sales/priority";
import { SalesMenu } from "./sales-menu";

export function salesPriorityTone(priority?: string | null) {
	switch (normalizeSalesPriority(priority)) {
		case "CRITICAL":
			return "border-red-200 bg-red-50 text-red-700";
		case "HIGH":
			return "border-amber-200 bg-amber-50 text-amber-800";
		case "LOW":
			return "border-slate-200 bg-slate-50 text-slate-600";
		default:
			return "border-zinc-200 bg-zinc-50 text-zinc-700";
	}
}

export function SalesPriorityBadge({
	priority,
	className,
}: {
	priority?: string | null;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={`${salesPriorityTone(priority)} rounded-full text-[11px] font-semibold uppercase ${className || ""}`}
		>
			{getSalesPriorityLabel(priority)}
		</Badge>
	);
}

function useUpdateSalesPriority({
	salesId,
	orderId,
}: {
	salesId?: number | null;
	orderId?: string | null;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	return useMutation(
		trpc.sales.updatePriority.mutationOptions({
			onSuccess: async (_, variables) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrdersV2.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.productionOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.productions.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.productionsV2.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.productionDashboard.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.productionDashboardV2.pathKey(),
					}),
				]);
					const priority = (
						variables as { priority?: SalesPriorityValue } | undefined
					)?.priority;
				toast({
					title: "Priority updated.",
					description: `Sales order priority is now ${getSalesPriorityLabel(priority)}.`,
					variant: "success",
				});
			},
		}),
	);
}

export function SalesPriorityMenuItems({
	salesId,
	orderId,
	priority,
}: {
	salesId?: number | null;
	orderId?: string | null;
	priority?: string | null;
}) {
	const updatePriority = useUpdateSalesPriority({ salesId, orderId });
	const currentPriority = normalizeSalesPriority(priority);

	return (
		<SalesMenu.Sub>
			<SalesMenu.SubTrigger>
				<Icons.AlertTriangle className="mr-2 size-4 text-muted-foreground/70" />
				Set priority
			</SalesMenu.SubTrigger>
			<SalesMenu.SubContent>
				{SALES_PRIORITY_OPTIONS.map((option) => (
					<SalesMenu.Item
						key={option.value}
						disabled={updatePriority.isPending || currentPriority === option.value}
						onSelect={(event) => {
							event.preventDefault();
							updatePriority.mutate({
								salesId: salesId || undefined,
								orderId: orderId || undefined,
								priority: option.value,
							});
						}}
					>
						<span className="mr-2 flex size-4 items-center justify-center">
							{currentPriority === option.value ? (
								<Icons.Check className="size-4 text-muted-foreground/70" />
							) : null}
						</span>
						{option.label}
					</SalesMenu.Item>
				))}
			</SalesMenu.SubContent>
		</SalesMenu.Sub>
	);
}

export function SalesPrioritySelect({
	salesId,
	orderId,
	priority,
}: {
	salesId?: number | null;
	orderId?: string | null;
	priority?: string | null;
}) {
	const updatePriority = useUpdateSalesPriority({ salesId, orderId });
	const value = normalizeSalesPriority(priority);

	return (
		<div className="flex items-center gap-2">
			<SalesPriorityBadge priority={value} />
			<Select
				value={value}
				onValueChange={(nextPriority) => {
					updatePriority.mutate({
						salesId: salesId || undefined,
						orderId: orderId || undefined,
						priority: nextPriority as SalesPriorityValue,
					});
				}}
				disabled={updatePriority.isPending}
			>
				<SelectTrigger className="h-8 w-[136px] rounded-xl">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{SALES_PRIORITY_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{updatePriority.isPending ? (
				<Button variant="ghost" size="icon" className="size-8" disabled>
					<Icons.Loader2 className="size-4 animate-spin" />
				</Button>
			) : null}
		</div>
	);
}
