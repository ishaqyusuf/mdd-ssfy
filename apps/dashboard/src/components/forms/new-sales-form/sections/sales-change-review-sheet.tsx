"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useEffect, useState } from "react";

type InboundDisposition = "CANCEL_OPEN_INBOUND" | "KEEP_IN_WAREHOUSE";

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
		reviewReasons: Array<"REFUND" | "INBOUND" | "INVENTORY">;
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
	requiresInboundDisposition: boolean;
	requiresOperationalAcknowledgement: boolean;
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
	isAwaitingApplication?: boolean;
	onSubmit: (input: {
		inboundDisposition: InboundDisposition | null;
		acknowledgeOperationalImpact: boolean;
	}) => Promise<void>;
}) {
	const review = props.review;
	const [inboundDisposition, setInboundDisposition] =
		useState<InboundDisposition | null>(null);
	const [acknowledged, setAcknowledged] = useState(false);

	useEffect(() => {
		if (!props.open) {
			setInboundDisposition(null);
			setAcknowledged(false);
		}
	}, [props.open]);

	const canSubmit = Boolean(
		review &&
			(!review.requiresInboundDisposition || inboundDisposition) &&
			(!review.requiresOperationalAcknowledgement || acknowledged),
	);

	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader>
					<SheetTitle>Review sale changes</SheetTitle>
					<SheetDescription>
						Approve this snapshot to commit the changes automatically.
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
							{review.commitments.allocatedQty > 0 ? (
								<Badge variant="secondary">
									Allocated {review.commitments.allocatedQty}
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
							{review.settlement.walletCredit > 0 ? (
								<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
									<p className="text-xs text-emerald-700">Wallet refund</p>
									<p className="mt-1 font-semibold text-emerald-900">
										{money(review.settlement.walletCredit)}
									</p>
								</div>
							) : null}
						</div>

						{review.blockedLines.length ? (
							<div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
								<p className="font-semibold">
									Completed work will remain in the audit history.
								</p>
								{review.blockedLines.map((line) => (
									<p key={line.uid} className="mt-1 text-xs">
										{line.title}: proposed {line.proposedQty}, minimum{" "}
										{line.minimumAllowedQty} already completed or fulfilled. The
										sale quantity can change, but this evidence will not be
										erased.
									</p>
								))}
							</div>
						) : null}

						{review.requiresInboundDisposition ? (
							<div className="space-y-3 rounded-xl border p-4">
								<div>
									<p className="text-sm font-semibold">Open inbound handling</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Choose what happens to quantity already placed on inbound
										shipments.
									</p>
								</div>
								<RadioGroup
									value={inboundDisposition || undefined}
									onValueChange={(value) =>
										setInboundDisposition(value as InboundDisposition)
									}
									className="gap-3"
								>
									<Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
										<RadioGroupItem value="CANCEL_OPEN_INBOUND" />
										<span>
											<span className="block text-sm font-medium">
												Cancel open inbound quantity
											</span>
											<span className="mt-1 block text-xs text-muted-foreground">
												Reduce the linked shipment quantity. Already received
												stock remains recorded.
											</span>
										</span>
									</Label>
									<Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
										<RadioGroupItem value="KEEP_IN_WAREHOUSE" />
										<span>
											<span className="block text-sm font-medium">
												Keep for warehouse stock
											</span>
											<span className="mt-1 block text-xs text-muted-foreground">
												Remove the reduced amount from this sale, but retain the
												supplier shipment quantity for general stock.
											</span>
										</span>
									</Label>
								</RadioGroup>
							</div>
						) : null}

						{review.requiresOperationalAcknowledgement ? (
							<Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 font-normal text-amber-950">
								<Checkbox
									checked={acknowledged}
									onCheckedChange={(checked) =>
										setAcknowledged(checked === true)
									}
								/>
								<span className="text-sm">
									I understand this sale already has inventory, inbound,
									production, or fulfillment activity. Preserve that evidence
									and apply this correction under my account.
								</span>
							</Label>
						) : null}

						<Button
							className="w-full"
							disabled={props.isSubmitting || !canSubmit}
							onClick={() =>
								void props.onSubmit({
									inboundDisposition,
									acknowledgeOperationalImpact: acknowledged,
								})
							}
						>
							{props.isSubmitting
								? props.isAwaitingApplication
									? "Checking status…"
									: "Committing changes…"
								: props.isAwaitingApplication
									? "Check status"
									: "Approve"}
						</Button>
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
