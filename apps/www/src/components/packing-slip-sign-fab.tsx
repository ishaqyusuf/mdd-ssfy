"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useSignature } from "@/hooks/use-signature";
import { useTRPC } from "@/trpc/client";
import type { PrintPage } from "@gnd/sales/print/types";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "sonner";

import { SignaturePad } from "./signature-pad";

interface PackingSlipSignFabProps {
	page?: PrintPage | null;
	token: string;
	preview?: boolean;
	templateId?: string;
}

export function PackingSlipSignFab({
	page,
	token,
	preview = false,
	templateId,
}: PackingSlipSignFabProps) {
	const signing = page?.signing;
	const dispatchId = signing?.dispatchId ?? null;
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [receivedBy, setReceivedBy] = useState(
		signing?.receivedBy || signing?.customerName || "",
	);
	const [signatureValue, setSignatureValue] = useState("");
	const [isRefreshingSlip, setIsRefreshingSlip] = useState(false);
	const signature = useSignature({
		id: `packing-slip-signature-${dispatchId || "new"}`,
		title: `packing-slip-${dispatchId || "signature"}`,
	});

	useEffect(() => {
		setReceivedBy(signing?.receivedBy || signing?.customerName || "");
	}, [signing?.customerName, signing?.receivedBy]);

	const mutation = useMutation(
		trpc.dispatch.signPackingSlip.mutationOptions({
			async onSuccess() {
				setIsRefreshingSlip(true);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.print.salesV2.queryKey({
							token,
							preview,
							templateId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.packingList.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.orderDispatchOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.pathKey(),
					}),
				]);
				await Promise.all([
					queryClient.refetchQueries({
						queryKey: trpc.print.salesV2.queryKey({
							token,
							preview,
							templateId,
						}),
					}),
					queryClient.refetchQueries({
						queryKey: trpc.dispatch.packingList.pathKey(),
					}),
					queryClient.refetchQueries({
						queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
					}),
					queryClient.refetchQueries({
						queryKey: trpc.dispatch.orderDispatchOverview.pathKey(),
					}),
					queryClient.refetchQueries({
						queryKey: trpc.sales.getSaleOverview.pathKey(),
					}),
				]);
				toast.success("Packing slip signed.");
				window.location.reload();
			},
			onError(error) {
				setIsRefreshingSlip(false);
				toast.error(error.message || "Unable to sign packing slip.");
			},
		}),
	);

	if (page?.config.mode !== "packing-slip" || !dispatchId) {
		return null;
	}

	const packedBy = auth.name || signing?.packedBy || "Current user";
	const isBusy = mutation.isPending || isRefreshingSlip;
	const deliveredAtMs = signing?.deliveredAt
		? new Date(signing.deliveredAt).getTime()
		: null;
	const isResignExpired =
		!!signing?.signatureUrl &&
		!!deliveredAtMs &&
		Date.now() - deliveredAtMs > 5 * 60 * 1000;

	if (isResignExpired) {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				onClick={() => {
					if (isBusy) return;
					setOpen(true);
				}}
				className="fixed bottom-6 right-6 z-50 rounded-full px-5 shadow-xl"
				disabled={isBusy}
			>
				<Icons.Edit className="mr-2 size-4" />
				<span>
					{isBusy
						? "Updating packing slip..."
						: signing?.signatureUrl
							? "Re-sign"
							: "Sign"}
				</span>
			</Button>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (isBusy) return;
					setOpen(nextOpen);
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Sign Packing Slip</DialogTitle>
						<DialogDescription>
							Submitting will save the signature, pack all items into this
							delivery, complete the dispatch, and reload the packing slip
							once the updated quantities are ready.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="packing-slip-packed-by">Packed By</Label>
								<Input
									id="packing-slip-packed-by"
									value={packedBy}
									readOnly
									disabled
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="packing-slip-received-by">Received By</Label>
								<Input
									id="packing-slip-received-by"
									value={receivedBy}
									onChange={(event) => setReceivedBy(event.target.value)}
								/>
							</div>
						</div>

						<SignaturePad
							signatureId={signature.id}
							onSignatureChange={(value) => {
								setSignatureValue(value);
							}}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isBusy}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={
								isBusy ||
								!dispatchId ||
								!auth.id ||
								!receivedBy.trim() ||
								!signatureValue
							}
							onClick={async () => {
								const pathname = await signature.saveSignature(
									"dispatch-documents",
									receivedBy.trim() || `dispatch-${dispatchId}`,
								);
								if (!pathname) {
									toast.error("Unable to save signature image.");
									return;
								}

								await mutation.mutateAsync({
									dispatchId,
									receivedBy: receivedBy.trim(),
									noteType: "pickup",
									signature: pathname,
								});
							}}
						>
							{isRefreshingSlip
								? "Reloading slip..."
								: mutation.isPending
									? "Completing packing..."
									: "Submit"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
