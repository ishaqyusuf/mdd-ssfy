"use client";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
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
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useId, useState } from "react";

export function VariantStockThresholdDialog({
	variantId,
	override,
}: { variantId: number; override: number | null }) {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const id = useId();
	const [open, setOpen] = useState(false);
	const [inherit, setInherit] = useState(override == null);
	const [value, setValue] = useState(String(override ?? 0));
	useEffect(() => {
		if (open) {
			setInherit(override == null);
			setValue(String(override ?? 0));
		}
	}, [open, override]);
	const save = useMutation(
		trpc.inventories.setVariantStockThreshold.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				setOpen(false);
				toast({ title: "Threshold saved", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to save threshold",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const number = value.trim() ? Number(value) : Number.NaN;
	const canManage = Boolean(
		auth.can.editInboundOrder || auth.can.editSalesComponent,
	);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Low-stock setting
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Individual stock threshold</DialogTitle>
					<DialogDescription>
						Apply an override to this variant or inherit the category’s
						threshold.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center justify-between">
					<Label htmlFor={`${id}-inherit`}>Inherit category threshold</Label>
					<Switch
						id={`${id}-inherit`}
						checked={inherit}
						onCheckedChange={setInherit}
						disabled={!canManage || save.isPending}
					/>
				</div>
				{!inherit ? (
					<div className="space-y-2">
						<Label htmlFor={`${id}-value`}>Low-stock threshold</Label>
						<Input
							id={`${id}-value`}
							type="number"
							min={0}
							step={1}
							value={value}
							onChange={(event) => setValue(event.target.value)}
							disabled={!canManage || save.isPending}
						/>
					</div>
				) : null}
				<Button
					disabled={
						!canManage ||
						save.isPending ||
						(!inherit &&
							(!Number.isInteger(number) || number < 0 || number > 2147483647))
					}
					onClick={() =>
						save.mutate({
							inventoryVariantId: variantId,
							lowStockAlert: inherit ? null : number,
						})
					}
				>
					Save threshold
				</Button>
			</DialogContent>
		</Dialog>
	);
}
