"use client";

import { CustomerEmailRequiredDialog } from "@/components/modals/customer-email-required-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { hasSpecialOrderCustomerEmail } from "@gnd/sales/special-order";
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

type ReasonDialog = "enroll" | "reapproval" | "remove" | null;

async function copyTextToClipboard(value: string) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(value);
			return;
		}
	} catch {
		// Fall through when async clipboard access loses user activation.
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "");
	textarea.setAttribute("aria-hidden", "true");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	let copied = false;
	try {
		textarea.focus();
		textarea.select();
		copied = document.execCommand("copy");
	} finally {
		textarea.remove();
	}
	if (!copied) {
		throw new Error("The browser blocked clipboard access.");
	}
}

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
	const auth = useAuth();
	const queryClient = useQueryClient();
	const [reasonDialog, setReasonDialog] = useState<ReasonDialog>(null);
	const [reason, setReason] = useState("");
	const [emailRequirementOpen, setEmailRequirementOpen] = useState(false);
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
	const enrollmentAccess = useQuery(
		trpc.specialOrder.enrollmentAccess.queryOptions(undefined, {
			enabled: data?.type === "order" && salesId > 0,
			staleTime: 0,
		}),
	);
	const canEnrollFromOverview =
		!governed &&
		!data?.isDealerSale &&
		Boolean(auth.can?.editOrders) &&
		enrollmentAccess.data?.canEnroll === true;

	const invalidate = async () => {
		await Promise.all([
			query.salesQuery.invalidate.saleOverview(),
			query.salesQuery.invalidate.salesDocumentChanged("order"),
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
	const enrollFromOverview = useMutation(
		trpc.specialOrder.enrollFromOverview.mutationOptions({
			async onSuccess(result) {
				setReasonDialog(null);
				setReason("");
				setEmailRequirementOpen(false);
				await invalidate();
				toast.success(
					result.enrolled
						? "Special Order enabled. No approval request was sent."
						: "This order is already a Special Order.",
				);
			},
		}),
	);
	const prepareApprovalLink = useMutation(
		trpc.specialOrder.prepareApprovalLink.mutationOptions(),
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
		enrollFromOverview.isPending ||
		requestApproval.isPending ||
		requestReapproval.isPending ||
		prepareApprovalLink.isPending ||
		removeSpecialOrder.isPending ||
		retryNotifications.isPending;
	const normalizedReason = reason.trim();
	const optionalReasonIsTooShort =
		normalizedReason.length > 0 && normalizedReason.length < 3;
	const reasonIsRequired = reasonDialog === "reapproval";
	const requiredReasonIsTooShort =
		reasonIsRequired &&
		normalizedReason.length > 0 &&
		normalizedReason.length < 3;
	const submitEnrollment = () =>
		enrollFromOverview.mutateAsync({
			salesId,
			reason: normalizedReason || null,
		});
	const proceedEnrollment = async () => {
		if (optionalReasonIsTooShort) return;
		if (!hasSpecialOrderCustomerEmail(data?.email)) {
			if (!data?.customerId) {
				toast.error(
					"Assign a customer before marking this as a Special Order.",
				);
				return;
			}
			setReasonDialog(null);
			setEmailRequirementOpen(true);
			return;
		}
		try {
			await submitEnrollment();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to mark this as a Special Order.",
			);
		}
	};
	const copyApprovalLink = async () => {
		try {
			const result = await prepareApprovalLink.mutateAsync({ salesId });
			void invalidate().catch(() => undefined);
			await copyTextToClipboard(result.approvalUrl);
			toast.success("Approval link copied to clipboard.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to copy the approval link.",
			);
		}
	};

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

					{canEnrollFromOverview ? (
						<Button
							size="sm"
							disabled={isPending || !salesId}
							onClick={() => setReasonDialog("enroll")}
						>
							<Icons.PenTool className="mr-2 size-4" />
							Mark as Special Order
						</Button>
					) : null}
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
									{specialOrder?.status !== "CUSTOMER_APPROVED" ? (
										<DropdownMenuItem
											onSelect={() => void copyApprovalLink()}
										>
											<Icons.Copy className="mr-2 size-4" />
											Copy approval link
										</DropdownMenuItem>
									) : null}
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
							{reasonDialog === "enroll"
								? "Mark as Special Order"
								: reasonDialog === "reapproval"
									? "Request Re-Approval"
									: "Remove Special Order"}
						</DialogTitle>
						<DialogDescription>
							{reasonDialog === "enroll"
								? "This starts the Special Order approval lifecycle for the current order revision. You may add a reason for the classification. The customer will not be contacted until you send an approval request separately."
								: reasonDialog === "reapproval"
									? "The current approval will be superseded immediately. Explain why the customer must approve again."
									: "All requests and customer evidence will remain in history. You may add a reason for removing this classification."}
						</DialogDescription>
					</DialogHeader>
					<label className="text-sm font-medium" htmlFor="special-order-action-reason">
						{reasonIsRequired ? "Reason" : "Reason (optional)"}
					</label>
					<Textarea
						id="special-order-action-reason"
						aria-label="Reason"
						aria-describedby="special-order-action-reason-help"
						aria-invalid={
							requiredReasonIsTooShort || optionalReasonIsTooShort
						}
						placeholder="Enter a reason"
						required={reasonIsRequired}
						minLength={3}
						maxLength={500}
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					/>
					<p
						id="special-order-action-reason-help"
						className={
							requiredReasonIsTooShort || optionalReasonIsTooShort
								? "text-xs text-destructive"
								: "text-xs text-muted-foreground"
						}
					>
						{reasonIsRequired
							? "Required. Enter at least 3 characters to continue."
							: "Optional. Enter at least 3 characters, or leave it blank."}
					</p>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setReasonDialog(null);
								setReason("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant={reasonDialog === "remove" ? "destructive" : "default"}
							disabled={
								isPending ||
								(reasonIsRequired && normalizedReason.length < 3) ||
								(!reasonIsRequired && optionalReasonIsTooShort)
							}
							onClick={() => {
								if (reasonDialog === "enroll") {
									void proceedEnrollment();
								} else if (reasonDialog === "reapproval") {
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
							{reasonDialog === "enroll"
								? "Mark as Special Order"
								: reasonDialog === "reapproval"
									? "Supersede & Send"
									: "Confirm Removal"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<CustomerEmailRequiredDialog
				open={emailRequirementOpen}
				onOpenChange={setEmailRequirementOpen}
				customerId={data?.customerId}
				customerName={data?.displayName}
				description="Special Orders require a customer email. Save it now to finish classification; no approval request will be sent."
				onSaved={async () => {
					await submitEnrollment();
				}}
			/>
		</>
	);
}
