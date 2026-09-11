"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
} from "@gnd/ui/alert-dialog";
import { toast } from "@gnd/ui/use-toast";

export function ShortLoadConfirmation(props: {
	salesId: number;
	fulfillmentId: number;
}) {
	const [open, setOpen] = useState(false);
	const [confirmedInventoryRevision, setConfirmedInventoryRevision] = useState<string | null>(null);
	const trpc = useTRPC();
	const cache = useQueryClient();
	const request = useRef<{ revision: string; id: string } | null>(null);
	const preview = useQuery(
		trpc.dispatch.fulfillmentShortLoadPreview.queryOptions(props, {
			enabled: open,
		}),
	);
	const mutation = useMutation(
		trpc.dispatch.confirmFulfillmentShortLoad.mutationOptions({
			onSuccess: async (result) => {
				await cache.invalidateQueries({ queryKey: trpc.dispatch.pathKey() });
				setOpen(false);
				toast({ title: `${result.releasedQty} units returned to backlog`, description: result.notificationFailed ? "The driver notification could not be delivered." : undefined });
			},
		}),
	);
	const quantity = (value: { qty: number; lh: number; rh: number }) =>
		value.lh + value.rh > 0
			? `${value.lh} LH / ${value.rh} RH`
			: String(value.qty);
	const physicalReturnsConfirmed = Boolean(
		preview.data?.inventoryRevision &&
		confirmedInventoryRevision === preview.data.inventoryRevision,
	);
	return (
		<>
			<Button
				variant="outline"
				className="mt-3"
				onClick={() => {
					mutation.reset();
					setConfirmedInventoryRevision(null);
					setOpen(true);
				}}
			>
				Confirm short load
			</Button>
			<AlertDialog
				open={open}
				onOpenChange={(value) => {
					if (!mutation.isPending) setOpen(value);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm short load</AlertDialogTitle>
						<AlertDialogDescription>
							Keep the packed quantities on this fulfillment and release the
							items left behind to backlog.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{preview.isPending ? (
						<p>Loading quantities…</p>
					) : preview.isError ? (
						<p role="alert">{preview.error.message}</p>
					) : (
						<>
							<div className="max-h-72 overflow-y-auto space-y-3">
								{preview.data.lines.map((line) => (
									<div key={line.uid} className="border-b pb-3 text-sm">
										<p className="font-medium">{line.title}</p>
										<p className="text-muted-foreground">{line.size}</p>
										<p>
											Assigned: {quantity(line.assigned)} · Packed:{" "}
											{quantity(line.packed)} · Left behind:{" "}
											{quantity(line.leftBehind)}
										</p>
									</div>
								))}
							</div>
							<p>{preview.data.releasedQty} units will return to backlog.</p>
							{preview.data.requiresPhysicalReturn && (
								<label className="flex items-start gap-2 text-sm">
									<Checkbox
										checked={physicalReturnsConfirmed}
										disabled={mutation.isPending || preview.isFetching}
										onCheckedChange={(checked) => setConfirmedInventoryRevision(
											checked === true ? preview.data.inventoryRevision : null,
										)}
									/>
									<span>I confirm the excess picked inventory has been physically returned.</span>
								</label>
							)}
							{preview.data.blockedReason && (
								<p role="alert">{preview.data.blockedReason}</p>
							)}
						</>
					)}
					{mutation.isError && (
						<p role="alert" className="text-destructive">
							{mutation.error.message}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={mutation.isPending}>
							Cancel
						</AlertDialogCancel>
						{(preview.isError || mutation.isError) && (
							<Button
								variant="outline"
								onClick={() => preview.refetch()}
								disabled={mutation.isPending}
							>
								Refresh quantities
							</Button>
						)}
						<Button
							disabled={
								!preview.data?.canConfirm ||
								(preview.data.requiresPhysicalReturn && !physicalReturnsConfirmed) ||
								preview.isFetching ||
								mutation.isPending
							}
							onClick={() => {
								if (!preview.data?.canConfirm) return;
								if (preview.data.requiresPhysicalReturn && !physicalReturnsConfirmed) return;
								const revision = preview.data.revision;
								const requestRevision = JSON.stringify([revision, preview.data.inventoryRevision, physicalReturnsConfirmed]);
								if (request.current?.revision !== requestRevision)
									request.current = { revision: requestRevision, id: crypto.randomUUID() };
								mutation.mutate({
									...props,
									expectedRevision: revision,
									expectedInventoryRevision: preview.data.inventoryRevision ?? undefined,
									physicalReturnsConfirmed,
									requestId: request.current.id,
								});
							}}
						>
							{mutation.isPending ? "Confirming…" : "Confirm short load"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
