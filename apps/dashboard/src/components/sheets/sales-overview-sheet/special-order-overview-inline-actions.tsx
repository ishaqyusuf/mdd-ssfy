"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export type SpecialOrderInlineActionsModel = {
	actionLabel: string;
	canEnroll: boolean;
	confirmEnrollment: boolean;
	governed: boolean;
	isApproved: boolean;
	isEnrollmentPending: boolean;
	isPending: boolean;
	salesId: number;
};

export function SpecialOrderOverviewInlineActions({
	model,
	onCancelEnrollment,
	onConfirmEnrollment,
	onCopyApprovalLink,
	onMarkSpecialOrder,
	onRemove,
	onRequestApproval,
	onRequestReapproval,
}: {
	model: SpecialOrderInlineActionsModel;
	onCancelEnrollment: () => void;
	onConfirmEnrollment: () => void;
	onCopyApprovalLink: () => void;
	onMarkSpecialOrder: () => void;
	onRemove: () => void;
	onRequestApproval: () => void;
	onRequestReapproval: () => void;
}) {
	const canAct = !model.isPending && model.salesId > 0;

	return (
		<div className="flex flex-col gap-3">
			{model.canEnroll && !model.confirmEnrollment ? (
				<Button
					type="button"
					size="sm"
					className="w-fit"
					disabled={!canAct}
					onClick={onMarkSpecialOrder}
				>
					<Icons.PenTool data-icon="inline-start" />
					Mark as Special Order
				</Button>
			) : null}

			{model.canEnroll && model.confirmEnrollment ? (
				<div
					className="flex flex-col gap-2.5 border-l-2 border-primary/60 pl-3"
					aria-live="polite"
				>
					<p className="text-sm font-medium">
						Are you sure you want to continue?
					</p>
					<p className="text-xs text-muted-foreground">
						This marks the current order as a Special Order. The customer will
						not be contacted until you send an approval request.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={model.isPending}
							onClick={onCancelEnrollment}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={model.isPending}
							onClick={onConfirmEnrollment}
						>
							{model.isEnrollmentPending ? (
								<Icons.Loader2
									data-icon="inline-start"
									className="animate-spin"
								/>
							) : null}
							Continue
						</Button>
					</div>
				</div>
			) : null}

			{model.governed ? (
				<div className="flex flex-wrap gap-2">
					{!model.isApproved ? (
						<>
							<Button
								type="button"
								size="sm"
								disabled={!canAct}
								onClick={onRequestApproval}
							>
								<Icons.Send data-icon="inline-start" />
								{model.actionLabel}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={!canAct}
								onClick={onCopyApprovalLink}
							>
								<Icons.Copy data-icon="inline-start" />
								Copy approval link
							</Button>
						</>
					) : (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!canAct}
							onClick={onRequestReapproval}
						>
							<Icons.RotateCcw data-icon="inline-start" />
							Request Re-Approval
						</Button>
					)}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="text-destructive hover:text-destructive"
						disabled={!canAct}
						onClick={onRemove}
					>
						<Icons.Trash2 data-icon="inline-start" />
						Remove Special Order
					</Button>
				</div>
			) : null}
		</div>
	);
}
