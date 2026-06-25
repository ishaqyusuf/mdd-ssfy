"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "sonner";

export function SendForPackingButton({
	salesId,
	orderNo,
	className,
	variant = "outline",
	size = "sm",
}: {
	salesId?: number | null;
	orderNo?: string | null;
	className?: string;
	variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
	size?: "sm" | "xs" | "default" | "lg" | "icon";
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const mutation = useMutation(
		trpc.dispatch.sendSaleForPickup.mutationOptions({
			async onSuccess(result) {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.packingList.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.packingQueue.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.orderDispatchOverview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverviewV2.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSaleOverview.queryKey(),
					}),
				]);

				if (!result.hasRemainingItems) {
					toast.info(
						`No remaining items are available to send ${orderNo ? `for ${orderNo}` : "for packing"}.`,
					);
					return;
				}

				toast.success(
					result.created
						? `Created packing list delivery for ${result.orderNo || orderNo || "sale"}.`
						: `Sent ${result.orderNo || orderNo || "sale"} to packing.`,
				);
			},
			onError(error) {
				toast.error(error.message || "Unable to send sale for packing.");
			},
		}),
	);

	return (
		<TooltipProvider delayDuration={100}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						size={size}
						variant={variant}
						className={className}
						disabled={!salesId || mutation.isPending}
						onClick={() => {
							if (!salesId) return;
							mutation.mutate({ salesId });
						}}
					>
						<Icons.packingList className="size-3.5" />
						<span>{mutation.isPending ? "Packing..." : "Pack"}</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="max-w-64 text-xs">
					Send remaining order items to the packing queue.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
