"use client";

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
import { Textarea } from "@gnd/ui/textarea";
import { type FormEvent, useState } from "react";

type Decision = "approve" | "reject";

type DealerRequest = {
	id: number;
	quoteNo?: string | null;
	dealerName?: string | null;
	customerName?: string | null;
	deliveryOption?: string | null;
	currentDeliveryCost?: number | null;
	deliveryCostSuggestion?: {
		cost: number;
		reason: string;
		source: "sales_settings";
	} | null;
	fulfillmentRecipient?: unknown;
};

type ApprovalPayload = {
	requestId: number;
	deliveryCost?: number | null;
	approverNote?: string | null;
};

type RejectionPayload = {
	requestId: number;
	reason?: string | null;
};

function recipientSummary(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	const text = (key: string) =>
		typeof record[key] === "string" ? String(record[key]).trim() : "";
	const address = [
		text("address1"),
		text("address2"),
		text("city"),
		text("state"),
		text("zip_code"),
		text("country"),
	]
		.filter(Boolean)
		.join(", ");

	if (!text("name") && !text("email") && !text("phoneNo") && !address) {
		return null;
	}

	return {
		name: text("name"),
		contact: [text("phoneNo"), text("email")].filter(Boolean).join(" · "),
		address,
	};
}

export function DealerRequestDecisionActions({
	request,
	onApprove,
	onReject,
	isApproving = false,
	isRejecting = false,
}: {
	request: DealerRequest;
	onApprove: (payload: ApprovalPayload) => Promise<unknown>;
	onReject: (payload: RejectionPayload) => Promise<unknown>;
	isApproving?: boolean;
	isRejecting?: boolean;
}) {
	const [decision, setDecision] = useState<Decision | null>(null);
	const [deliveryCost, setDeliveryCost] = useState("0");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const mode = String(request.deliveryOption || "pickup").toLowerCase();
	const requiresDeliveryReview = mode === "delivery" || mode === "ship";
	const recipient = recipientSummary(request.fulfillmentRecipient);
	const isPending = isApproving || isRejecting;

	function open(nextDecision: Decision) {
		setDecision(nextDecision);
		const initialDeliveryCost = Number.isFinite(
			Number(request.currentDeliveryCost),
		)
			? Number(request.currentDeliveryCost)
			: Number(request.deliveryCostSuggestion?.cost || 0);
		setDeliveryCost(String(initialDeliveryCost));
		setNote("");
		setError(null);
	}

	function close() {
		if (isPending) return;
		setDecision(null);
		setError(null);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmedNote = note.trim();

		if (decision === "reject") {
			if (trimmedNote.length < 3) {
				setError("Explain why the request is being rejected.");
				return;
			}
			try {
				await onReject({ requestId: request.id, reason: trimmedNote });
				setDecision(null);
			} catch {
				// The mutation's onError handler owns user-facing feedback.
			}
			return;
		}

		if (decision !== "approve") return;
		const parsedCost = Number(deliveryCost);
		if (
			requiresDeliveryReview &&
			(!Number.isFinite(parsedCost) || parsedCost < 0)
		) {
			setError("Enter a valid delivery cost of zero or more.");
			return;
		}

		try {
			await onApprove({
				requestId: request.id,
				deliveryCost: requiresDeliveryReview ? parsedCost : null,
				approverNote: trimmedNote || null,
			});
			setDecision(null);
		} catch {
			// The mutation's onError handler owns user-facing feedback.
		}
	}

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<Button size="sm" disabled={isPending} onClick={() => open("approve")}>
					<Icons.CheckCheck className="mr-2 size-4" />
					Approve
				</Button>
				<Button
					size="sm"
					variant="outline"
					disabled={isPending}
					onClick={() => open("reject")}
				>
					<Icons.XCircle className="mr-2 size-4" />
					Reject
				</Button>
			</div>

			<Dialog
				open={decision !== null}
				onOpenChange={(open) => !open && close()}
			>
				<DialogContent className="max-w-lg">
					<form onSubmit={submit}>
						<DialogHeader>
							<DialogTitle>
								{decision === "approve"
									? "Review and approve dealer request"
									: "Reject dealer request"}
							</DialogTitle>
							<DialogDescription>
								Quote {request.quoteNo || request.id} from{" "}
								{request.dealerName || "dealer"}
								{request.customerName ? ` for ${request.customerName}` : ""}.
							</DialogDescription>
						</DialogHeader>

						<div className="my-5 space-y-4">
							<div className="rounded-md border bg-muted/30 p-3 text-sm">
								<div className="font-medium capitalize">{mode}</div>
								{recipient ? (
									<div className="mt-1 space-y-1 text-muted-foreground">
										{recipient.name ? <p>{recipient.name}</p> : null}
										{recipient.contact ? <p>{recipient.contact}</p> : null}
										{recipient.address ? <p>{recipient.address}</p> : null}
									</div>
								) : (
									<p className="mt-1 text-muted-foreground">
										No delivery recipient is required for pickup.
									</p>
								)}
							</div>

							{decision === "approve" && requiresDeliveryReview ? (
								<div className="space-y-2">
									<Label htmlFor={`dealer-delivery-cost-${request.id}`}>
										Reviewed {mode} cost
									</Label>
									<Input
										id={`dealer-delivery-cost-${request.id}`}
										inputMode="decimal"
										min="0"
										step="0.01"
										type="number"
										value={deliveryCost}
										onChange={(event) => setDeliveryCost(event.target.value)}
										autoFocus
										required
									/>
									<p className="text-xs text-muted-foreground">
										{request.deliveryCostSuggestion
											? `Automated suggestion: $${request.deliveryCostSuggestion.cost.toFixed(2)} · ${request.deliveryCostSuggestion.reason}. You can override it after review.`
											: "Use 0 when no delivery charge applies."}
									</p>
								</div>
							) : null}

							<div className="space-y-2">
								<Label htmlFor={`dealer-decision-note-${request.id}`}>
									{decision === "reject"
										? "Reason"
										: "Approver note (optional)"}
								</Label>
								<Textarea
									id={`dealer-decision-note-${request.id}`}
									maxLength={1000}
									placeholder={
										decision === "reject"
											? "Explain what the dealer needs to change before requesting again."
											: "Record delivery pricing context or approval conditions."
									}
									value={note}
									onChange={(event) => setNote(event.target.value)}
									required={decision === "reject"}
								/>
							</div>

							{error ? (
								<p className="text-sm text-destructive" role="alert">
									{error}
								</p>
							) : null}
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={close}
								disabled={isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant={decision === "reject" ? "destructive" : "default"}
								disabled={isPending}
							>
								{isPending
									? "Saving..."
									: decision === "reject"
										? "Reject request"
										: "Approve and create order"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
