"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu } from "@gnd/ui/namespace";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

import type { SalesArchiveCandidate } from "./sales-archive-selection";
export { getSalesArchiveCandidates } from "./sales-archive-selection";
export type { SalesArchiveCandidate } from "./sales-archive-selection";

export function SalesArchiveMenu({
	orders,
	disabled,
	onChanged,
	onClose,
}: {
	orders: readonly SalesArchiveCandidate[];
	disabled?: boolean;
	onChanged?: (ids: number[]) => void;
	onClose: () => void;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const [selection, setSelection] = useState<{
		archived: boolean;
		ids: number[];
	} | null>(null);
	const mutation = useMutation(
		trpc.sales.setSalesOrdersArchived.mutationOptions({
			onSuccess(result) {
				const archived = selection?.archived;
				setSelection(null);
				onChanged?.(result.changed);
				onClose();
				toast({
					title: archived ? "Orders archived" : "Orders restored",
					description: `${result.changed.length} changed; ${result.skipped.length} skipped.`,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Orders not updated",
					description: error.message,
					variant: "error",
				});
			},
			meta: {
				queryEventScope: {
					sales: orders.map((order) => ({
						salesId: order.salesId,
						orderNo: order.orderNo,
						salesType: "order" as const,
					})),
				},
			},
		}),
	);
	if (!auth.can.editOrders || !orders.length) return null;
	const unique = [
		...new Map(orders.map((order) => [order.salesId, order])).values(),
	];
	return (
		<>
			<DropdownMenu.Separator />
			{[true, false].map((archived) => {
				const ids = unique
					.filter((order) => order.archived !== archived)
					.map((order) => order.salesId);
				if (!ids.length) return null;
				return (
					<DropdownMenu.Item
						key={String(archived)}
						disabled={disabled || mutation.isPending}
						onSelect={(event) => {
							event.preventDefault();
							setSelection({ archived, ids });
						}}
					>
						<Icons.Archive className="mr-2 size-4" />
						{archived ? "Archived" : "Restore active"}
						{unique.some((order) => order.archived) &&
						unique.some((order) => !order.archived)
							? ` (${ids.length})`
							: ""}
					</DropdownMenu.Item>
				);
			})}
			<Dialog
				open={selection !== null}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setSelection(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{selection?.archived ? "Archive orders" : "Restore orders"}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{selection?.archived
							? `Archive ${selection.ids.length} order(s)? They remain available in Archived and through direct links. Operational work continues; archiving does not change production, payments, fulfillment, or Sales Bin.`
							: `Return ${selection?.ids.length ?? 0} order(s) to the active Sales Orders workspace?`}
					</p>
					{(selection?.ids.length ?? 0) > 100 ? (
						<p role="alert">Select at most 100 orders at a time.</p>
					) : null}
					<DialogFooter>
						<Button
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => setSelection(null)}
						>
							Cancel
						</Button>
						<Button
							disabled={
								mutation.isPending || !selection || selection.ids.length > 100
							}
							onClick={() => {
								if (selection)
									mutation.mutate({
										salesIds: selection.ids,
										archived: selection.archived,
									});
							}}
						>
							{mutation.isPending
								? "Updating…"
								: selection?.archived
									? "Archive orders"
									: "Restore orders"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
