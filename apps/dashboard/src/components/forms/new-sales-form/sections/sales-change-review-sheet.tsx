"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Textarea } from "@gnd/ui/textarea";
import { useState } from "react";

type ChangeLine = {
	uid: string;
	title: string;
	beforeQty: number;
	afterQty: number;
	quantityDelta: number;
	beforeLineTotal: number;
	afterLineTotal: number;
};

type ChangeReview = {
	analysis: {
		direction: string;
		lines: ChangeLine[];
		beforeGrandTotal: number;
		afterGrandTotal: number;
		totalDelta: number;
	};
	settlement: {
		amountDue: number;
		walletCredit: number;
		paymentAppliedAfter: number;
	};
	commitments: {
		paymentTotal: number;
		paymentCount: number;
		refundablePaymentCount: number;
		allocatedQty: number;
		inboundQty: number;
		productionQty: number;
		fulfilledQty: number;
	};
	blockedLines: Array<{
		uid: string;
		title: string;
		proposedQty: number;
		minimumAllowedQty: number;
	}>;
};

function money(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);
}

export function SalesChangeReviewSheet(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	review: ChangeReview | null;
	isLoading: boolean;
	isSubmitting: boolean;
	approvalUrl: string | null;
	onSubmit: (input: {
		reason: string;
		recipient: string | null;
	}) => Promise<void>;
}) {
	const [reason, setReason] = useState("");
	const [recipient, setRecipient] = useState("");
	const review = props.review;

	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader>
					<SheetTitle>Review committed sale changes</SheetTitle>
					<SheetDescription>
						The live sale remains unchanged until the customer approves this
						snapshot.
					</SheetDescription>
				</SheetHeader>

				{props.isLoading ? (
					<div className="mt-6 space-y-3">
						<div className="h-20 animate-pulse rounded-xl bg-muted" />
						<div className="h-40 animate-pulse rounded-xl bg-muted" />
					</div>
				) : review ? (
					<div className="mt-6 space-y-5">
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">{review.analysis.direction}</Badge>
							{review.commitments.paymentTotal > 0 ? (
								<Badge variant="secondary">
									{money(review.commitments.paymentTotal)} paid
								</Badge>
							) : null}
							{review.commitments.inboundQty > 0 ? (
								<Badge variant="secondary">
									Inbound {review.commitments.inboundQty}
								</Badge>
							) : null}
							{review.commitments.productionQty > 0 ? (
								<Badge variant="secondary">
									Production {review.commitments.productionQty}
								</Badge>
							) : null}
							{review.commitments.fulfilledQty > 0 ? (
								<Badge variant="secondary">
									Fulfilled {review.commitments.fulfilledQty}
								</Badge>
							) : null}
						</div>

						<div className="overflow-hidden rounded-xl border">
							<div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
								<span>Item</span>
								<span>Previous</span>
								<span>New</span>
							</div>
							{review.analysis.lines.map((line) => (
								<div
									key={line.uid}
									className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
								>
									<div className="min-w-0">
										<p className="truncate font-medium">{line.title}</p>
										<p className="text-xs text-muted-foreground">
											{money(line.beforeLineTotal)} →{" "}
											{money(line.afterLineTotal)}
										</p>
									</div>
									<span className="tabular-nums">{line.beforeQty}</span>
									<span
										className={
											line.quantityDelta < 0
												? "font-semibold text-amber-700"
												: "font-semibold text-blue-700"
										}
									>
										{line.afterQty}
									</span>
								</div>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border p-3">
								<p className="text-xs text-muted-foreground">New total</p>
								<p className="mt-1 font-semibold">
									{money(review.analysis.afterGrandTotal)}
								</p>
							</div>
							<div className="rounded-xl border p-3">
								<p className="text-xs text-muted-foreground">Amount due</p>
								<p className="mt-1 font-semibold">
									{money(review.settlement.amountDue)}
								</p>
							</div>
							<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
								<p className="text-xs text-emerald-700">Wallet refund</p>
								<p className="mt-1 font-semibold text-emerald-900">
									{money(review.settlement.walletCredit)}
								</p>
							</div>
						</div>

						{review.blockedLines.length ? (
							<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
								<p className="font-semibold">
									This change cannot be submitted.
								</p>
								{review.blockedLines.map((line) => (
									<p key={line.uid} className="mt-1 text-xs">
										{line.title}: proposed {line.proposedQty}, minimum{" "}
										{line.minimumAllowedQty} already completed or fulfilled.
									</p>
								))}
							</div>
						) : null}

						{props.approvalUrl ? (
							<div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
								<p className="font-semibold">Approval request created</p>
								<p className="mt-1 break-all text-xs">{props.approvalUrl}</p>
								<Button
									className="mt-3"
									size="sm"
									variant="outline"
									onClick={() =>
										navigator.clipboard.writeText(props.approvalUrl || "")
									}
								>
									Copy approval link
								</Button>
							</div>
						) : (
							<div className="space-y-3">
								<div>
									<label
										className="text-sm font-medium"
										htmlFor="sales-change-reason"
									>
										Reason for change
									</label>
									<Textarea
										id="sales-change-reason"
										value={reason}
										onChange={(event) => setReason(event.target.value)}
										placeholder="Customer requested a lower quantity…"
									/>
								</div>
								<div>
									<label
										className="text-sm font-medium"
										htmlFor="sales-change-recipient"
									>
										Customer contact reference (optional)
									</label>
									<Input
										id="sales-change-recipient"
										value={recipient}
										onChange={(event) => setRecipient(event.target.value)}
										placeholder="customer@example.com"
									/>
								</div>
								<Button
									className="w-full"
									disabled={
										reason.trim().length < 3 ||
										props.isSubmitting ||
										review.blockedLines.length > 0
									}
									onClick={() =>
										props.onSubmit({
											reason: reason.trim(),
											recipient: recipient.trim() || null,
										})
									}
								>
									{props.isSubmitting
										? "Creating approval request…"
										: "Create customer approval link"}
								</Button>
							</div>
						)}
					</div>
				) : (
					<p className="mt-6 text-sm text-muted-foreground">
						No quantity change is ready for review.
					</p>
				)}
			</SheetContent>
		</Sheet>
	);
}
