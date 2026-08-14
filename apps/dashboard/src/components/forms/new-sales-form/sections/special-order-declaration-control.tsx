"use client";

import { CustomerEmailRequiredDialog } from "@/components/modals/customer-email-required-dialog";
import {
	getSpecialOrderStatusLabel,
	hasSpecialOrderCustomerEmail,
} from "@gnd/sales/special-order";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@gnd/ui/field";
import { Textarea } from "@gnd/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Declaration = "NO" | "YES";

type Props = {
	salesId?: number | null;
	customerId?: number | null;
	customerEmail?: string | null;
	customerName?: string | null;
	declaration?: Declaration | null;
	status?:
		| "NOT_REQUIRED"
		| "SIGNATURE_PENDING"
		| "CUSTOMER_APPROVED"
		| "REAPPROVAL_REQUIRED"
		| "CUSTOMER_DECLINED"
		| null;
	showDeclarationControl?: boolean;
	requiredPromptOpen?: boolean;
	onRequiredPromptOpenChange?: (open: boolean) => void;
	onChange: (input: {
		declaration: Declaration;
		changeReason?: string | null;
	}) => void;
	onRequiredDecision?: (declaration: Declaration) => void;
	onCustomerEmailSaved?: (email: string) => void;
};

const NEXT_ACTION = {
	NOT_REQUIRED: "No customer approval is required.",
	SIGNATURE_PENDING:
		"Send the customer an approval request from Sales Overview.",
	CUSTOMER_APPROVED: "The current order revision has customer approval.",
	REAPPROVAL_REQUIRED: "The customer must approve the current revision again.",
	CUSTOMER_DECLINED: "Review the decline before sending a revised request.",
} as const;

export function SpecialOrderDeclarationControl(props: Props) {
	const [changeDialogOpen, setChangeDialogOpen] = useState(false);
	const [pendingDeclaration, setPendingDeclaration] =
		useState<Declaration | null>(null);
	const [requiredDeclaration, setRequiredDeclaration] =
		useState<Declaration | null>(null);
	const [reason, setReason] = useState("");
	const [emailRequirement, setEmailRequirement] = useState<
		"change" | "required" | null
	>(null);
	const hasCustomerEmail = hasSpecialOrderCustomerEmail(props.customerEmail);

	useEffect(() => {
		if (!props.requiredPromptOpen) {
			setRequiredDeclaration(null);
			if (emailRequirement === "required") setEmailRequirement(null);
			return;
		}
		if (
			props.declaration === "YES" &&
			!hasCustomerEmail &&
			props.customerId &&
			!emailRequirement
		) {
			setRequiredDeclaration("YES");
			setEmailRequirement("required");
		}
	}, [
		emailRequirement,
		hasCustomerEmail,
		props.customerId,
		props.declaration,
		props.requiredPromptOpen,
	]);

	const statusLabel = getSpecialOrderStatusLabel({
		declaration: props.declaration,
		status: props.status,
	});
	const nextAction = props.declaration
		? NEXT_ACTION[
				props.declaration === "NO"
					? "NOT_REQUIRED"
					: (props.status ?? "SIGNATURE_PENDING")
			]
		: "Choose Yes or No before Save & Close or final save.";

	function requestChange(declaration: string) {
		if (declaration !== "YES" && declaration !== "NO") return;
		if (declaration === props.declaration) return;
		if (props.salesId) {
			setPendingDeclaration(declaration);
			setReason("");
			setChangeDialogOpen(true);
			return;
		}
		if (declaration === "YES" && !hasCustomerEmail) {
			if (!props.customerId) {
				toast.error(
					"Select a customer before marking this as a Special Order.",
				);
				return;
			}
			setPendingDeclaration("YES");
			setEmailRequirement("change");
			return;
		}
		props.onChange({ declaration });
	}

	function applyPendingChange() {
		if (!pendingDeclaration) return;
		props.onChange({
			declaration: pendingDeclaration,
			changeReason: props.salesId ? reason.trim() : null,
		});
		setPendingDeclaration(null);
		setReason("");
	}

	return (
		<>
			{props.showDeclarationControl !== false ? (
				<section className="rounded-md border bg-background p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-sm font-semibold">Special Order</p>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								This declaration applies to the complete order.
							</p>
						</div>
						<Badge
							variant={props.declaration === "YES" ? "default" : "outline"}
						>
							{statusLabel}
						</Badge>
					</div>
					<Field className="mt-4">
						<FieldLabel>
							Does this order contain Special Order items?
						</FieldLabel>
						<ToggleGroup
							type="single"
							variant="outline"
							className="w-full"
							value={props.declaration ?? ""}
							onValueChange={requestChange}
						>
							<ToggleGroupItem value="NO" aria-label="Not a Special Order">
								No
							</ToggleGroupItem>
							<ToggleGroupItem value="YES" aria-label="Special Order">
								Yes
							</ToggleGroupItem>
						</ToggleGroup>
						<FieldDescription>{nextAction}</FieldDescription>
					</Field>
				</section>
			) : null}

			<Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{pendingDeclaration === "YES"
								? "Make this a Special Order?"
								: "Remove Special Order classification?"}
						</DialogTitle>
						<DialogDescription>
							This change affects customer approval and is recorded in Sales
							Activity. Historical approval evidence is preserved.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="special-order-change-reason">
							Reason
						</FieldLabel>
						<Textarea
							id="special-order-change-reason"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Explain why the classification is changing"
							rows={3}
						/>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setChangeDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							disabled={!pendingDeclaration || reason.trim().length < 3}
							onClick={() => {
								if (!pendingDeclaration) return;
								setChangeDialogOpen(false);
								if (pendingDeclaration === "YES" && !hasCustomerEmail) {
									if (!props.customerId) {
										toast.error(
											"Select a customer before marking this as a Special Order.",
										);
										return;
									}
									setEmailRequirement("change");
									return;
								}
								applyPendingChange();
							}}
						>
							Confirm change
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={
					props.showDeclarationControl !== false &&
					props.requiredPromptOpen &&
					emailRequirement !== "required"
				}
				onOpenChange={(open) => props.onRequiredPromptOpenChange?.(open)}
			>
				<DialogContent hideClose>
					<DialogHeader>
						<DialogTitle>Special Order declaration required</DialogTitle>
						<DialogDescription>
							Choose whether the complete order contains special, custom, or
							non-returnable items. Your work remains saved in this form.
						</DialogDescription>
					</DialogHeader>
					<ToggleGroup
						type="single"
						variant="outline"
						className="w-full"
						value={requiredDeclaration ?? ""}
						onValueChange={(value) => {
							if (value === "YES" || value === "NO")
								setRequiredDeclaration(value);
						}}
					>
						<ToggleGroupItem value="NO">No — ordinary order</ToggleGroupItem>
						<ToggleGroupItem value="YES">Yes — Special Order</ToggleGroupItem>
					</ToggleGroup>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => props.onRequiredPromptOpenChange?.(false)}
						>
							Return to order
						</Button>
						<Button
							disabled={!requiredDeclaration}
							onClick={() => {
								if (!requiredDeclaration) return;
								if (requiredDeclaration === "YES" && !hasCustomerEmail) {
									if (!props.customerId) {
										toast.error(
											"Select a customer before marking this as a Special Order.",
										);
										return;
									}
									setEmailRequirement("required");
									return;
								}
								props.onRequiredDecision?.(requiredDeclaration);
							}}
						>
							Continue
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<CustomerEmailRequiredDialog
				open={emailRequirement !== null}
				onOpenChange={(open) => {
					if (!open) {
						if (emailRequirement === "required") {
							props.onRequiredPromptOpenChange?.(false);
						}
						setEmailRequirement(null);
					}
				}}
				customerId={props.customerId}
				customerName={props.customerName}
				description="Special Orders require a customer email so the approval request can be delivered."
				onSaved={async (email) => {
					const requirement = emailRequirement;
					props.onCustomerEmailSaved?.(email);
					setEmailRequirement(null);
					if (requirement === "change") {
						applyPendingChange();
						return;
					}
					if (requirement === "required") {
						props.onRequiredDecision?.("YES");
					}
				}}
			/>
		</>
	);
}
