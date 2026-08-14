"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useSaleOverview } from "./context";

type ReasonDialog = "reapproval" | "remove" | null;

function statusDescription(
	declaration: string | null | undefined,
	status: string | null | undefined,
) {
	if (declaration === "NO") {
		return "This order was explicitly marked as not requiring approval.";
	}
	if (declaration !== "YES") {
		return "This legacy order has not been evaluated.";
	}
	if (status === "CUSTOMER_APPROVED") {
		return "The current approval revision is customer approved.";
	}
	if (status === "REAPPROVAL_REQUIRED") {
		return "Customer approval is required again for the current revision.";
	}
	if (status === "CUSTOMER_DECLINED") {
		return "The customer declined this approval revision.";
	}
	return "Customer signature is pending.";
}

export function SpecialOrderOverviewCard() {
	const { data, query } = useSaleOverview();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [reasonDialog, setReasonDialog] = useState<ReasonDialog>(null);
	const [reason, setReason] = useState("");
	const [showHistory, setShowHistory] = useState(false);
	const salesId = data?.id ?? 0;
	const specialOrder = data?.specialOrder;
	const governed = specialOrder?.declaration === "YES";
	const evaluated = specialOrder?.declaration != null;
	const historyQuery = useQuery(
		trpc.specialOrder.history.queryOptions(
			{ salesId },
			{ enabled: showHistory && evaluated && salesId > 0 },
		),
	);

	const invalidate = async () => {
		await Promise.all([
			query.salesQuery.invalidate.saleOverview(),
			queryClient.invalidateQueries({
				queryKey: trpc.specialOrder.history.queryKey({ salesId }),
			}),
		]);
	};

	const requestApproval = useMutation(
		trpc.specialOrder.requestApproval.mutationOptions({
			async onSuccess(result) {
				await invalidate();
				toast.success(
					result.deliveryStatus === "skipped"
						? "Approval request prepared; email delivery is disabled locally"
						: `Approval request sent to ${result.email}`,
				);
			},
			onError(error) {
				toast.error(error.message);
			},
		}),
	);
	const requestReapproval = useMutation(
		trpc.specialOrder.requestReapproval.mutationOptions({
			async onSuccess(result) {
				setReasonDialog(null);
				setReason("");
				await invalidate();
				toast.success(
					result.deliveryStatus === "skipped"
						? "Re-approval recorded; email delivery is disabled locally"
						: `Re-approval request sent to ${result.email}`,
				);
			},
			onError(error) {
				toast.error(error.message);
			},
		}),
	);
	const removeSpecialOrder = useMutation(
		trpc.specialOrder.remove.mutationOptions({
			async onSuccess(result) {
				setReasonDialog(null);
				setReason("");
				await invalidate();
				toast.success(
					result.customerNotification === "pending"
						? "Special Order removed; customer notification is pending"
						: "Special Order classification removed",
				);
			},
			onError(error) {
				toast.error(error.message);
			},
		}),
	);
	const retryNotifications = useMutation(
		trpc.specialOrder.retryNotifications.mutationOptions({
			async onSuccess(result) {
				await invalidate();
				if (result.retryable) {
					toast.error("Some Special Order notifications still need attention.");
				} else {
					toast.success("Special Order notifications processed.");
				}
			},
			onError(error) {
				toast.error(error.message);
			},
		}),
	);

	const actionLabel = specialOrder?.currentRequestId
		? "Resend Approval Request"
		: specialOrder?.status === "CUSTOMER_DECLINED"
			? "Send Revised Request"
			: specialOrder?.status === "REAPPROVAL_REQUIRED"
				? "Send Re-Approval Request"
				: "Send Approval Request";
	const isPending =
		requestApproval.isPending ||
		requestReapproval.isPending ||
		removeSpecialOrder.isPending ||
		retryNotifications.isPending;
	const normalizedReason = reason.trim();
	const optionalReasonIsTooShort =
		normalizedReason.length > 0 && normalizedReason.length < 3;

	if (data?.type === "quote") return null;

	return (
		<>
			<Card>
				<CardContent className="space-y-4 p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-sm font-semibold">Special Order</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{statusDescription(
									specialOrder?.declaration,
									specialOrder?.status,
								)}
							</p>
						</div>
						<Badge
							variant={
								specialOrder?.status === "CUSTOMER_DECLINED"
									? "destructive"
									: governed
										? "default"
										: "outline"
							}
						>
							{specialOrder?.label || "Not evaluated"}
						</Badge>
					</div>

					{governed ? (
						<div className="flex flex-wrap gap-2">
							{specialOrder?.status !== "CUSTOMER_APPROVED" ? (
								<Button
									size="sm"
									disabled={isPending || !salesId}
									onClick={() => requestApproval.mutate({ salesId })}
								>
									<Icons.Send className="mr-2 size-4" />
									{actionLabel}
								</Button>
							) : null}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="sm" variant="outline" disabled={isPending}>
										<Icons.MoreHorizontal className="mr-2 size-4" />
										Approval Options
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{specialOrder?.status === "CUSTOMER_APPROVED" ? (
										<DropdownMenuItem
											onSelect={() => setReasonDialog("reapproval")}
										>
											<Icons.RotateCcw className="mr-2 size-4" />
											Request Re-Approval
										</DropdownMenuItem>
									) : null}
									<DropdownMenuItem
										onSelect={() => setShowHistory((current) => !current)}
									>
										<Icons.History className="mr-2 size-4" />
										{showHistory
											? "Hide Approval History"
											: "View Approval History"}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onSelect={() => setReasonDialog("remove")}
									>
										<Icons.Trash2 className="mr-2 size-4" />
										Remove Special Order
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					) : null}
					{evaluated && !governed ? (
						<Button
							size="sm"
							variant="outline"
							disabled={isPending}
							onClick={() => setShowHistory((current) => !current)}
						>
							<Icons.History className="mr-2 size-4" />
							{showHistory ? "Hide Approval History" : "View Approval History"}
						</Button>
					) : null}

					{showHistory ? (
						<div className="space-y-3 border-t pt-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Approval history
							</p>
							{historyQuery.isPending ? (
								<p className="text-sm text-muted-foreground">
									Loading history…
								</p>
							) : historyQuery.data?.evidence.length ||
								historyQuery.data?.requests.length ||
								historyQuery.data?.notificationDeliveries.length ? (
								<div className="space-y-2">
									{historyQuery.data.evidence.map((entry) => (
										<div
											key={entry.id}
											className="rounded-md border p-3 text-xs"
										>
											<div className="flex items-center justify-between gap-3">
												<span className="font-medium">
													{entry.outcome === "APPROVED"
														? "Customer approved"
														: "Customer declined"}
												</span>
												<span className="text-muted-foreground">
													{format(
														new Date(entry.acknowledgedAt),
														"MMM d, yyyy h:mm a",
													)}
												</span>
											</div>
											<p className="mt-1 text-muted-foreground">
												{entry.customerName} · Policy v
												{entry.policyVersion.version}
												{entry.supersededAt ? " · Superseded" : " · Current"}
											</p>
											{entry.declineReason ? (
												<p className="mt-2">Reason: {entry.declineReason}</p>
											) : null}
											{entry.hasSignature ? (
												<Button
													asChild
													size="sm"
													variant="outline"
													className="mt-2"
												>
													<a
														href={`/api/sales/special-order/evidence/${entry.id}/signature`}
														target="_blank"
														rel="noreferrer"
													>
														View signature
													</a>
												</Button>
											) : null}
										</div>
									))}
									{historyQuery.data.requests.map((entry) => (
										<div
											key={entry.id}
											className="rounded-md border p-3 text-xs"
										>
											<div className="flex items-center justify-between gap-3">
												<span className="font-medium">
													Approval request {entry.status.toLowerCase()}
												</span>
												<span className="text-muted-foreground">
													{format(new Date(entry.sentAt), "MMM d, yyyy h:mm a")}
												</span>
											</div>
											<p className="mt-1 text-muted-foreground">
												{entry.sentToEmail} · Policy v
												{entry.policyVersion.version}
											</p>
										</div>
									))}
									{historyQuery.data.notificationDeliveries.map((entry) => {
										const failed = [
											entry.customerStatus,
											entry.staffStatus,
											entry.inAppStatus,
										].includes("FAILED");
										return (
											<div
												key={entry.id}
												className="rounded-md border p-3 text-xs"
											>
												<div className="flex flex-wrap items-center justify-between gap-3">
													<span className="font-medium">
														{entry.eventType.toLowerCase()} notifications
													</span>
													{failed ? (
														<Button
															size="sm"
															variant="outline"
															disabled={retryNotifications.isPending}
															onClick={() =>
																retryNotifications.mutate({
																	salesId,
																	deliveryId: entry.id,
																})
															}
														>
															Retry notifications
														</Button>
													) : (
														<Badge variant="outline">Complete</Badge>
													)}
												</div>
												<p className="mt-1 text-muted-foreground">
													Customer {entry.customerStatus.toLowerCase()} · Staff{" "}
													{entry.staffStatus.toLowerCase()} · In-app{" "}
													{entry.inAppStatus.toLowerCase()}
												</p>
												{entry.lastError ? (
													<p className="mt-2 text-destructive">
														{entry.lastError}
													</p>
												) : null}
											</div>
										);
									})}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No approval events yet.
								</p>
							)}
						</div>
					) : null}
				</CardContent>
			</Card>

			<Dialog
				open={reasonDialog !== null}
				onOpenChange={(open) => {
					if (!open) {
						setReasonDialog(null);
						setReason("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{reasonDialog === "reapproval"
								? "Request Re-Approval"
								: "Remove Special Order"}
						</DialogTitle>
						<DialogDescription>
							{reasonDialog === "reapproval"
								? "The current approval will be superseded immediately. Explain why the customer must approve again."
								: "All requests and customer evidence will remain in history. You may add a reason for removing this classification."}
						</DialogDescription>
					</DialogHeader>
					<label className="text-sm font-medium" htmlFor="special-order-action-reason">
						{reasonDialog === "remove" ? "Reason (optional)" : "Reason"}
					</label>
					<Textarea
						id="special-order-action-reason"
						aria-label="Reason"
						placeholder="Enter a reason"
						maxLength={500}
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					/>
					{reasonDialog === "remove" && optionalReasonIsTooShort ? (
						<p className="text-xs text-destructive">
							Enter at least 3 characters, or leave the reason blank.
						</p>
					) : null}
					<DialogFooter>
						<Button variant="outline" onClick={() => setReasonDialog(null)}>
							Cancel
						</Button>
						<Button
							variant={reasonDialog === "remove" ? "destructive" : "default"}
							disabled={
								isPending ||
								(reasonDialog === "reapproval" && normalizedReason.length < 3) ||
								(reasonDialog === "remove" && optionalReasonIsTooShort)
							}
							onClick={() => {
								if (reasonDialog === "reapproval") {
									requestReapproval.mutate({
										salesId,
										reason: normalizedReason,
									});
								} else if (reasonDialog === "remove") {
									removeSpecialOrder.mutate({
										salesId,
										reason: normalizedReason || null,
									});
								}
							}}
						>
							{reasonDialog === "reapproval"
								? "Supersede & Send"
								: "Confirm Removal"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
