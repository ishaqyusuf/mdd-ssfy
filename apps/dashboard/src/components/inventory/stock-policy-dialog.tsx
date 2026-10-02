"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { type ReactNode, useEffect, useId, useState } from "react";
import { StockTrackingReviewDialog } from "./stock-tracking-review-dialog";

type Selector = { categoryId: number } | { stepId: number };
export function StockPolicyDialog({
	selector,
	trigger,
	open: controlledOpen,
	onOpenChange,
}: {
	selector: Selector;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const id = useId();
	const [localOpen, setLocalOpen] = useState(false);
	const open = controlledOpen ?? localOpen;
	const setOpen = onOpenChange ?? setLocalOpen;
	const [tracked, setTracked] = useState(false);
	const [threshold, setThreshold] = useState("0");
	const [piecesPerUnit, setPiecesPerUnit] = useState("1");
	const [stockUnit, setStockUnit] = useState("unconfirmed");
	const [review, setReview] = useState<
		| RouterOutputs["inventories"]["salesInventoryTrackingChangeRepairPreview"]
		| null
	>(null);
	const policy = useQuery(
		trpc.inventories.stockPolicy.queryOptions(selector, { enabled: open }),
	);
	useEffect(() => {
		if (!policy.data || !open) return;
		setTracked(policy.data.tracked);
		setThreshold(String(policy.data.lowStockAlert));
		setPiecesPerUnit(String(policy.data.piecesPerUnit));
		setStockUnit(policy.data.stockUnit ?? "unconfirmed");
	}, [policy.data, open]);
	const canManage = Boolean(
		auth.can.editInboundOrder || auth.can.editSalesComponent,
	);
	const repair = useMutation(
		trpc.inventories.salesInventoryTrackingChangeRepairPreview.mutationOptions({
			onSuccess: (preview) => setReview(preview),
			onError: (error) =>
				toast({
					title: "Unable to review current needs",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const save = useMutation(
		trpc.inventories.setStockPolicy.mutationOptions({
			onSuccess: async (result) => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				toast({ title: "Stock settings saved", variant: "success" });
				if (result.becameTracked)
					repair.mutate({ inventoryCategoryId: result.categoryId });
				setOpen(false);
			},
			onError: (error) =>
				toast({
					title: "Unable to save stock settings",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const value = threshold.trim() ? Number(threshold) : Number.NaN;
	const pieces = piecesPerUnit.trim() ? Number(piecesPerUnit) : Number.NaN;
	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Stock management{policy.data ? ` · ${policy.data.title}` : ""}
						</DialogTitle>
						<DialogDescription>
							These settings are shared by Inventory and every sales step using
							this category.
						</DialogDescription>
					</DialogHeader>
					{policy.isPending ? (
						<p>Loading stock settings…</p>
					) : policy.isError ? (
						<p role="alert">{policy.error.message}</p>
					) : (
						<div className="space-y-5">
							<div className="space-y-2">
								<Label htmlFor={`${id}-unit`}>Physical stock unit</Label>
								<Select
									value={stockUnit}
									onValueChange={setStockUnit}
									disabled={!canManage || save.isPending}
								>
									<SelectTrigger id={`${id}-unit`}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unconfirmed">Not confirmed</SelectItem>
										<SelectItem value="unit">Individual unit</SelectItem>
										<SelectItem value="kit">Complete kit</SelectItem>
										<SelectItem value="length">Individual length</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Confirm how the warehouse counts this category. This label
									does not convert existing quantities.
								</p>
							</div>
							<div className="flex items-center justify-between gap-3">
								<Label htmlFor={`${id}-tracked`}>
									Track stock for this category
								</Label>
								<Switch
									id={`${id}-tracked`}
									checked={tracked}
									disabled={!canManage || save.isPending}
									onCheckedChange={setTracked}
								/>
							</div>
							<p className="text-sm text-muted-foreground">
								Tracking makes this category and its components inventory needs.
								Existing sales are reviewed separately.
							</p>
							<div className="space-y-2">
								<Label htmlFor={`${id}-threshold`}>Low-stock threshold</Label>
								<Input
									id={`${id}-threshold`}
									type="number"
									min={0}
									step={1}
									value={threshold}
									disabled={!canManage || save.isPending}
									onChange={(event) => setThreshold(event.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									Variants inherit this value unless an individual threshold is
									set. Zero alerts only at zero stock.
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${id}-pieces`}>Pieces per selected unit</Label>
								<Input
									id={`${id}-pieces`}
									type="number"
									min={1}
									max={10000}
									step={1}
									value={piecesPerUnit}
									disabled={!canManage || save.isPending}
									onChange={(event) => setPiecesPerUnit(event.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									For hinges, enter 2 if each door uses 2 pieces. 5 doors will
									need 10 pieces. Stock counts and inbound quantities use
									pieces. Sales prices stay unchanged. Saved orders use the new
									setting after their inventory requirements are synchronized.
								</p>
							</div>
							<Button
								disabled={
									!canManage ||
									save.isPending ||
									!Number.isInteger(value) ||
									value < 0 ||
									value > 2147483647 ||
									!Number.isInteger(pieces) ||
									pieces < 1 ||
									pieces > 10000
								}
								onClick={() =>
									policy.data &&
									save.mutate({
										categoryId: policy.data.categoryId,
										tracked,
										lowStockAlert: value,
										promptAvailableStock: false,
										piecesPerUnit: pieces,
										stockUnit:
											stockUnit === "kit" ||
											stockUnit === "length" ||
											stockUnit === "unit"
												? stockUnit
												: null,
									})
								}
							>
								{save.isPending ? "Saving…" : "Save stock settings"}
							</Button>
							{policy.data?.tracked ? (
								<Button
									variant="outline"
									disabled={repair.isPending}
									onClick={() =>
										policy.data &&
										repair.mutate({
											inventoryCategoryId: policy.data.categoryId,
										})
									}
								>
									Review current needs
								</Button>
							) : null}
						</div>
					)}
				</DialogContent>
			</Dialog>
			{review ? (
				<StockTrackingReviewDialog
					preview={review}
					canRepair={Boolean(auth.can.editOrders || auth.can.editInboundOrder)}
					onClose={() => setReview(null)}
				/>
			) : null}
		</>
	);
}
