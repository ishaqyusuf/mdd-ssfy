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
import { Field, FieldLabel } from "@gnd/ui/field";
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
	onRequiredDecision?: (
		declaration: Declaration,
		reason?: string | null,
	) => void;
	onCustomerEmailSaved?: (email: string) => void;
	onRemoveClassification?: (reason?: string | null) => Promise<void>;
};

export function SpecialOrderDeclarationControl(props: Props) {
	const [changeDialogOpen, setChangeDialogOpen] = useState(false);
	const [pendingDeclaration, setPendingDeclaration] =
		useState<Declaration | null>(null);
	const [reason, setReason] = useState("");
	const [classificationPending, setClassificationPending] = useState(false);
	const [emailRequirement, setEmailRequirement] = useState<
		"change" | "required" | null
	>(null);
	const hasCustomerEmail = hasSpecialOrderCustomerEmail(props.customerEmail);
	const normalizedReason = reason.trim();
	const reasonIsTooShort =
		normalizedReason.length > 0 && normalizedReason.length < 3;

	useEffect(() => {
		if (!props.requiredPromptOpen) {
			if (emailRequirement === "required") setEmailRequirement(null);
			return;
		}
		if (!changeDialogOpen && emailRequirement !== "required") {
			setPendingDeclaration(props.declaration ?? "NO");
			setReason("");
		}
		if (
			props.declaration === "YES" &&
			!hasCustomerEmail &&
			props.customerId &&
			!emailRequirement
		) {
			setPendingDeclaration("YES");
			setEmailRequirement("required");
		}
	}, [
		changeDialogOpen,
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
	const classificationDialogOpen =
		changeDialogOpen ||
		Boolean(
			props.showDeclarationControl !== false &&
				props.requiredPromptOpen &&
				emailRequirement !== "required",
		);
	const classificationDialogMode = changeDialogOpen ? "change" : "required";

	function requestChange(declaration: string) {
		if (declaration !== "YES" && declaration !== "NO") return;
		if (declaration === props.declaration) return;
		if (props.salesId) {
			setPendingDeclaration(props.declaration ?? "NO");
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
			changeReason: props.salesId ? normalizedReason || null : null,
		});
		setPendingDeclaration(null);
		setReason("");
	}

	async function proceedClassification() {
		if (!pendingDeclaration || classificationPending) return;
		if (
			classificationDialogMode === "change" &&
			pendingDeclaration === props.declaration
		) {
			setChangeDialogOpen(false);
			setPendingDeclaration(null);
			setReason("");
			return;
		}
		if (pendingDeclaration === "YES" && !hasCustomerEmail) {
			if (!props.customerId) {
				toast.error(
					"Select a customer before marking this as a Special Order.",
				);
				return;
			}
			setChangeDialogOpen(false);
			setEmailRequirement(
				classificationDialogMode === "change" ? "change" : "required",
			);
			return;
		}
		if (classificationDialogMode === "required") {
			props.onRequiredDecision?.(pendingDeclaration, normalizedReason || null);
			return;
		}
		if (
			props.declaration === "YES" &&
			pendingDeclaration === "NO" &&
			props.onRemoveClassification
		) {
			setClassificationPending(true);
			try {
				await props.onRemoveClassification(normalizedReason || null);
				setChangeDialogOpen(false);
				setPendingDeclaration(null);
				setReason("");
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Unable to remove Special Order classification.",
				);
			} finally {
				setClassificationPending(false);
			}
			return;
		}
		setChangeDialogOpen(false);
		applyPendingChange();
	}

	return (
		<>
			{props.showDeclarationControl !== false ? (
				<section className="rounded-md border bg-background p-3">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-semibold">Special Order</p>
						<Badge
							variant={props.declaration === "YES" ? "default" : "outline"}
						>
							{statusLabel}
						</Badge>
					</div>
					<Field className="mt-2">
						<ToggleGroup
							type="single"
							variant="outline"
							className="w-full"
							value={props.declaration ?? "NO"}
							aria-label="Special Order classification"
						>
							<ToggleGroupItem
								value="NO"
								aria-label="Not a Special Order"
								className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
								onClick={() => requestChange("NO")}
							>
								No
							</ToggleGroupItem>
							<ToggleGroupItem
								value="YES"
								aria-label="Special Order"
								className="border-success bg-success text-success-foreground hover:bg-success/90 hover:text-success-foreground data-[state=on]:bg-success data-[state=on]:text-success-foreground"
								onClick={() => requestChange("YES")}
							>
								Yes
							</ToggleGroupItem>
						</ToggleGroup>
					</Field>
				</section>
			) : null}

			<Dialog
				open={classificationDialogOpen}
				onOpenChange={(open) => {
					if (open) return;
					setPendingDeclaration(null);
					setReason("");
					if (classificationDialogMode === "change") {
						setChangeDialogOpen(false);
						return;
					}
					props.onRequiredPromptOpenChange?.(false);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Special Order classification</DialogTitle>
						<DialogDescription>
							Choose whether the complete order contains special, custom, or
							non-returnable items. Classification changes are recorded in Sales
							Activity.
						</DialogDescription>
					</DialogHeader>
					<ToggleGroup
						type="single"
						variant="outline"
						className="w-full"
						value={pendingDeclaration ?? "NO"}
						onValueChange={(value) => {
							if (value === "YES" || value === "NO")
								setPendingDeclaration(value);
						}}
						aria-label="Special Order classification confirmation"
					>
						<ToggleGroupItem
							value="NO"
							className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
						>
							No
						</ToggleGroupItem>
						<ToggleGroupItem
							value="YES"
							className="border-success bg-success text-success-foreground hover:bg-success/90 hover:text-success-foreground data-[state=on]:bg-success data-[state=on]:text-success-foreground"
						>
							Yes
						</ToggleGroupItem>
					</ToggleGroup>
					<Field>
						<FieldLabel htmlFor="special-order-change-reason">
							Reason (optional)
						</FieldLabel>
						<Textarea
							id="special-order-change-reason"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Explain why the classification is changing"
							maxLength={500}
							rows={3}
						/>
						{reasonIsTooShort ? (
							<p className="text-xs text-destructive">
								Enter at least 3 characters, or leave the reason blank.
							</p>
						) : null}
					</Field>
					<DialogFooter>
						<Button
							disabled={classificationPending || reasonIsTooShort}
							onClick={() => void proceedClassification()}
						>
							{classificationPending ? "Removing…" : "Proceed"}
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
						props.onRequiredDecision?.("YES", normalizedReason || null);
					}
				}}
			/>
		</>
	);
}
