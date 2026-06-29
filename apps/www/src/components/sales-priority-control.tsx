"use client";

import { useTRPC } from "@/trpc/client";
import { cva } from "class-variance-authority";
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

function salesPriorityTone(priority?: string | null) {
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

const salesPriorityRowVariants = cva("", {
	variants: {
		priority: {
			CRITICAL: "bg-red-50/60 hover:bg-red-100/70",
			HIGH: "bg-amber-50/60 hover:bg-amber-100/70",
			LOW: "bg-slate-50/80 hover:bg-slate-100/90",
			NORMAL: "",
		},
	},
	defaultVariants: {
		priority: "NORMAL",
	},
});

export function salesPriorityRowClassName(priority?: string | null) {
	return salesPriorityRowVariants({
		priority: normalizeSalesPriority(priority),
	});
}

export function SalesPriorityBadge({
	priority,
	className,
}: {
	priority?: string | null;
	className?: string;
}) {
	if (normalizeSalesPriority(priority) === "NORMAL") return null;

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
