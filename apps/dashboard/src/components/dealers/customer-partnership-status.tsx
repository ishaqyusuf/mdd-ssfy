"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { toast } from "@gnd/ui/use-toast";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Partnership =
	RouterOutputs["customers"]["getCustomerOverviewV2"]["partnership"];

const positiveStates = new Set([
	"ELIGIBLE",
	"APPLICATION_APPROVED",
	"DEALER_ACTIVE",
]);
const warningStates = new Set([
	"INVITE_PENDING",
	"INVITE_SENT",
	"INVITE_OPENED",
	"APPLICATION_PENDING",
]);

function PartnershipBadge({ partnership }: { partnership: Partnership }) {
	return (
		<Badge
			variant={
				positiveStates.has(partnership.state)
					? "default"
					: warningStates.has(partnership.state)
						? "secondary"
						: "outline"
			}
			className="w-fit whitespace-nowrap"
		>
			{partnership.label}
		</Badge>
	);
}

function relevantDate(partnership: Partnership) {
	if (partnership.state.startsWith("DEALER_")) {
		return (
			partnership.dealer?.updatedAt || partnership.dealer?.approvedAt || null
		);
	}
	if (partnership.state.startsWith("APPLICATION_")) {
		return (
			partnership.application?.reviewedAt ||
			partnership.application?.submittedAt ||
			null
		);
	}
	return (
		partnership.invitation?.firstOpenedAt ||
		partnership.invitation?.deliveredAt ||
		partnership.invitation?.deliveryAttemptedAt ||
		partnership.invitation?.createdAt ||
		null
	);
}

function InvitationAction({
	customerId,
	partnership,
	compact = false,
}: {
	customerId: number;
	partnership: Partnership;
	compact?: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const invalidate = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.sales.customersIndex.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.customers.getCustomerOverviewV2.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dealerProgram.campaigns.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dealerProgram.applications.pathKey(),
			}),
		]);
	const sendCustomerInvitation = useMutation(
		trpc.dealerProgram.sendCustomerInvitation.mutationOptions({
			onSuccess: async (result) => {
				await invalidate();
				setConfirmOpen(false);
				toast({
					title:
						result.deliveryStatus === "SENT"
							? "Partnership invitation sent."
							: "Invitation delivery was not accepted.",
					variant: result.deliveryStatus === "SENT" ? "success" : "destructive",
				});
			},
			onError: (error) =>
				toast({
					title: "Could not send partnership invitation.",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const canAct = partnership.canSend || partnership.canResend;
	if (!canAct) return null;
	const isResend = partnership.canResend;
	const send = () => sendCustomerInvitation.mutate({ customerId });

	return (
		<>
			<Button
				type="button"
				size={compact ? "sm" : "default"}
				variant={isResend ? "outline" : "default"}
				disabled={sendCustomerInvitation.isPending}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					if (isResend) setConfirmOpen(true);
					else send();
				}}
			>
				<Icons.Mail className="mr-1.5 size-3.5" />
				{sendCustomerInvitation.isPending
					? "Sending…"
					: isResend
						? "Resend"
						: "Invite"}
			</Button>
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Content onClick={(event) => event.stopPropagation()}>
					<AlertDialog.Header>
						<AlertDialog.Title>
							Resend partnership invitation?
						</AlertDialog.Title>
						<AlertDialog.Description>
							A successful resend replaces every older unused invitation link.
							The previous usable link is preserved if this email attempt fails.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={sendCustomerInvitation.isPending}
							onClick={send}
						>
							Resend invitation
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}

export function CustomerPartnershipStatus({
	customerId,
	partnership,
}: {
	customerId: number;
	partnership: Partnership;
}) {
	const date = relevantDate(partnership);
	return (
		<div className="flex min-w-0 items-center justify-between gap-2">
			<div className="min-w-0 space-y-1">
				<PartnershipBadge partnership={partnership} />
				{date ? (
					<p className="truncate text-[11px] text-muted-foreground">
						{formatDate(date)}
					</p>
				) : null}
				{partnership.blockingReason || !date ? (
					<p
						className="truncate text-[11px] text-muted-foreground"
						title={partnership.blockingReason || undefined}
					>
						{partnership.blockingReason || "Ready to invite"}
					</p>
				) : null}
			</div>
			<InvitationAction
				compact
				customerId={customerId}
				partnership={partnership}
			/>
		</div>
	);
}

function Detail({ label, value }: { label: string; value?: string | null }) {
	if (!value) return null;
	return (
		<div className="rounded-lg border p-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 break-words text-sm font-medium">{value}</p>
		</div>
	);
}

export function CustomerPartnershipCard({
	customerId,
	partnership,
}: {
	customerId: number;
	partnership: Partnership;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div>
						<CardTitle>Dealership partnership</CardTitle>
						<CardDescription>
							Invitation, application, and dealer-account status.
						</CardDescription>
					</div>
					<PartnershipBadge partnership={partnership} />
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{partnership.blockingReason ? (
					<p className="text-sm text-muted-foreground">
						{partnership.blockingReason}
					</p>
				) : null}
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
					<Detail label="Campaign" value={partnership.campaign?.title} />
					<Detail
						label="Recipient"
						value={partnership.invitation?.recipientEmail}
					/>
					<Detail
						label="Sent by"
						value={partnership.invitation?.sentBy?.name || undefined}
					/>
					<Detail
						label="Sent"
						value={
							partnership.invitation?.deliveredAt
								? formatDate(partnership.invitation.deliveredAt)
								: undefined
						}
					/>
					<Detail
						label="Opened"
						value={
							partnership.invitation?.firstOpenedAt
								? formatDate(partnership.invitation.firstOpenedAt)
								: undefined
						}
					/>
					<Detail
						label="Invitation expires"
						value={
							partnership.invitation?.expiresAt
								? formatDate(partnership.invitation.expiresAt)
								: undefined
						}
					/>
					<Detail
						label="Application submitted"
						value={
							partnership.application?.submittedAt
								? formatDate(partnership.application.submittedAt)
								: undefined
						}
					/>
					<Detail
						label="Application reviewed"
						value={
							partnership.application?.reviewedAt
								? formatDate(partnership.application.reviewedAt)
								: undefined
						}
					/>
					<Detail label="Dealer status" value={partnership.dealer?.status} />
					<Detail
						label="Dealer status updated"
						value={
							partnership.dealer?.updatedAt
								? formatDate(partnership.dealer.updatedAt)
								: undefined
						}
					/>
				</div>
				<InvitationAction customerId={customerId} partnership={partnership} />
			</CardContent>
		</Card>
	);
}
