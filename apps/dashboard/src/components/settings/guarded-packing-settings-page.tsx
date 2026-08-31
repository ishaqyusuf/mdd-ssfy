"use client";

import { useTRPC } from "@/trpc/client";
import type { GuardedPackingPolicyInput } from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import {
	guardedPackingPolicyToInput,
	isGuardedPackingPolicyDraftChanged,
} from "./guarded-packing-settings-model";
import { SalesSettingsRouteSkeleton } from "./sales-settings-route-skeleton";
import { SettingsCard, SwitchRow } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

const REVIEW_OPTIONS = [
	{
		value: "BLOCK_DELIVERY_UNTIL_APPROVED",
		label: "Wait for approval",
		description:
			"Keep the dispatch blocked until the sales rep or another reviewer approves the verified quantity.",
	},
	{
		value: "ALLOW_DELIVERY_WHILE_PENDING",
		label: "Allow delivery while approval is pending",
		description:
			"Treat the verified quantity as sufficient for trip readiness while retaining the approval request and audit trail.",
	},
] as const;

export function GuardedPackingSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(
		trpc.sales.getGuardedPackingSettings.queryOptions(),
	);
	const persisted = settingsQuery.data?.settings ?? null;
	const [draftState, setDraftState] =
		useState<GuardedPackingPolicyInput | null>(null);
	const draft = persisted
		? (draftState ?? guardedPackingPolicyToInput(persisted))
		: null;

	const updateSettings = useMutation(
		trpc.sales.updateGuardedPackingSettings.mutationOptions({
			onSuccess(data) {
				setDraftState(null);
				queryClient.setQueryData(
					trpc.sales.getGuardedPackingSettings.queryKey(),
					{ settings: data.settings },
				);
				toast({
					variant: "success",
					title: "Delivery packing policy saved",
					description: data.changed
						? data.transition.notifiedDriverCount > 0
							? `${data.transition.notifiedDriverCount} assigned ${data.transition.notifiedDriverCount === 1 ? "driver was" : "drivers were"} notified that packing approval no longer blocks the trip.`
							: "The delivery policy is active for new and pending packing reports."
						: "The delivery packing policy was already up to date.",
				});
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to save delivery packing policy",
					description: error.message,
				});
			},
		}),
	);

	if (settingsQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load delivery packing settings"
				description="The current guarded-packing policy could not be loaded."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}
	if (settingsQuery.isPending || !persisted || !draft) {
		return <SalesSettingsRouteSkeleton cardCount={1} />;
	}

	const changed = isGuardedPackingPolicyDraftChanged(draft, persisted);
	return (
		<div>
			<SettingsCard
				title="Guarded packing"
				description="Control whether a driver or packing user may report physically verified items when production evidence is not ready."
				footer={
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							Policy revision {persisted.revision}
							{persisted.changedAt ? " · Configured" : " · Using defaults"}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								disabled={!changed || updateSettings.isPending}
								onClick={() => setDraftState(null)}
							>
								Discard
							</Button>
							<Button
								disabled={!changed || updateSettings.isPending}
								onClick={() => updateSettings.mutate(draft)}
							>
								{updateSettings.isPending ? <Spinner /> : null}
								Save delivery policy
							</Button>
						</div>
					</div>
				}
			>
				<div className="divide-y rounded-md border">
					<SwitchRow
						title="Allow guarded packing"
						description="Show selectable quantities for configured production blockers instead of forcing them to remain unavailable."
						checked={draft.enabled}
						onCheckedChange={(enabled) => setDraftState({ ...draft, enabled })}
					/>
				</div>

				<div
					aria-disabled={!draft.enabled}
					className="mt-5 space-y-5 border-l-2 border-muted pl-4 aria-disabled:opacity-60"
				>
					<div>
						<h3 className="text-sm font-semibold">Eligible blockers</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Choose which upstream states packing users may physically verify.
						</p>
					</div>
					<div className="divide-y rounded-md border">
						<SwitchRow
							title="Production submission missing"
							description="Allow items marked Awaiting production submission to be selected for review."
							checked={draft.allowAwaitingProductionSubmission}
							disabled={!draft.enabled}
							onCheckedChange={(allowAwaitingProductionSubmission) =>
								setDraftState({
									...draft,
									allowAwaitingProductionSubmission,
								})
							}
						/>
						<SwitchRow
							title="Material review pending"
							description="Allow quantities with unresolved production material review to be selected."
							checked={draft.allowPendingMaterialReview}
							disabled={!draft.enabled}
							onCheckedChange={(allowPendingMaterialReview) =>
								setDraftState({
									...draft,
									allowPendingMaterialReview,
								})
							}
						/>
					</div>
					<div className="space-y-5 pt-2">
						<div>
							<h3 className="text-sm font-semibold">
								After a quantity is verified
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Configure the review, notification, and production effects for
								guarded packing reports. Report snapshots retain the policy
								revision they were created with, while the current delivery
								policy controls whether pending approval blocks a trip.
							</p>
						</div>
						<RadioGroup
							disabled={!draft.enabled}
							value={draft.reviewMode}
							onValueChange={(reviewMode) => {
								if (
									reviewMode !== "BLOCK_DELIVERY_UNTIL_APPROVED" &&
									reviewMode !== "ALLOW_DELIVERY_WHILE_PENDING"
								)
									return;
								setDraftState({ ...draft, reviewMode });
							}}
							className="gap-3"
						>
							{REVIEW_OPTIONS.map((option) => (
								<label
									key={option.value}
									htmlFor={`guarded-packing-review-${option.value}`}
									className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40 has-[[data-disabled]]:cursor-not-allowed"
								>
									<RadioGroupItem
										id={`guarded-packing-review-${option.value}`}
										value={option.value}
										className="mt-0.5"
									/>
									<span>
										<span className="block text-sm font-medium">
											{option.label}
										</span>
										<span className="mt-1 block text-sm text-muted-foreground">
											{option.description}
										</span>
									</span>
								</label>
							))}
						</RadioGroup>

						<div className="mt-5 divide-y rounded-md border">
							<SwitchRow
								title="Notify the order sales rep"
								description="Send an in-app review notification when another employee or the driver reports the quantity. Self-notifications remain suppressed."
								checked={draft.notifySalesRep}
								disabled={!draft.enabled}
								onCheckedChange={(notifySalesRep) =>
									setDraftState({ ...draft, notifySalesRep })
								}
							/>
							{draft.allowAwaitingProductionSubmission ? (
								<SwitchRow
									title="Create production evidence on approval"
									description="When an approved item has no production submission, create the missing assignment/submission and then pack the verified quantity."
									checked={draft.createProductionEvidenceOnApproval}
									disabled={!draft.enabled}
									onCheckedChange={(createProductionEvidenceOnApproval) =>
										setDraftState({
											...draft,
											createProductionEvidenceOnApproval,
										})
									}
								/>
							) : null}
						</div>
					</div>
				</div>
			</SettingsCard>
		</div>
	);
}
