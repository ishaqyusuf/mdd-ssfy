"use client";

import { useTRPC } from "@/trpc/client";
import type { SalesHandoffTriggerInput } from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import {
	type SalesHandoffTriggerDraft,
	formatSalesHandoffTriggerChangedAt,
	getSalesHandoffTriggerPercentageError,
	hasSalesHandoffTriggerChanges,
	toSalesHandoffTriggerDraft,
	toSalesHandoffTriggerInput,
} from "./sales-handoff-trigger-settings-model";
import { SalesSettingsRouteSkeleton } from "./sales-settings-route-skeleton";
import { SettingsCard } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

const TRIGGER_OPTIONS = [
	{
		value: "FULLY_PAID",
		label: "Fully paid",
		description:
			"Create handoff actions only after the order has no remaining balance.",
	},
	{
		value: "ANY_PAYMENT",
		label: "Any payment received",
		description:
			"Create handoff actions after the first successful net order receipt.",
	},
	{
		value: "PAYMENT_PERCENTAGE",
		label: "Payment percentage reached",
		description:
			"Create handoff actions after successful net receipts reach a chosen percentage.",
	},
] as const satisfies ReadonlyArray<{
	value: SalesHandoffTriggerInput["mode"];
	label: string;
	description: string;
}>;

export function SalesHandoffTriggerSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(
		trpc.sales.getSalesHandoffTrigger.queryOptions(),
	);
	const [draftState, setDraftState] = useState<SalesHandoffTriggerDraft | null>(
		null,
	);
	const persisted = settingsQuery.data?.settings ?? null;
	const draft = persisted
		? (draftState ?? toSalesHandoffTriggerDraft(persisted))
		: null;

	const updateSettings = useMutation(
		trpc.sales.updateSalesHandoffTrigger.mutationOptions({
			onSuccess(data) {
				setDraftState(null);
				queryClient.setQueryData(trpc.sales.getSalesHandoffTrigger.queryKey(), {
					settings: data.settings,
				});
				toast({
					title: "Sales handoff trigger saved",
					description: data.changed
						? "Active orders will now be evaluated with the new payment policy."
						: "The payment policy was already up to date.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save Sales handoff trigger",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (settingsQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load Sales handoff trigger"
				description="The current payment policy could not be loaded."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	if (settingsQuery.isPending || !persisted || !draft) {
		return <SalesSettingsRouteSkeleton cardCount={1} />;
	}

	const validationError = getSalesHandoffTriggerPercentageError(draft);
	const input = toSalesHandoffTriggerInput(draft);
	const changed = hasSalesHandoffTriggerChanges(draft, persisted);

	return (
		<div className="flex flex-col gap-8">
			<SettingsCard
				title="Payment trigger"
				description="This global policy controls when Material and Production handoff actions become visible. It never creates an inbound or production assignment automatically."
			>
				<RadioGroup
					value={draft.mode}
					onValueChange={(mode) => {
						if (
							mode !== "FULLY_PAID" &&
							mode !== "ANY_PAYMENT" &&
							mode !== "PAYMENT_PERCENTAGE"
						)
							return;
						setDraftState({ ...draft, mode });
					}}
					className="gap-3"
					aria-label="Sales handoff payment trigger"
				>
					{TRIGGER_OPTIONS.map((option) => {
						const id = `sales-handoff-trigger-${option.value.toLowerCase()}`;
						return (
							<label
								key={option.value}
								htmlFor={id}
								className="flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40"
							>
								<RadioGroupItem
									id={id}
									value={option.value}
									className="mt-0.5"
								/>
								<span className="min-w-0">
									<span className="block text-sm font-medium">
										{option.label}
									</span>
									<span className="mt-1 block text-sm text-muted-foreground">
										{option.description}
									</span>
								</span>
							</label>
						);
					})}
				</RadioGroup>

				{draft.mode === "PAYMENT_PERCENTAGE" ? (
					<div className="mt-5 max-w-xs space-y-2">
						<Label htmlFor="sales-handoff-trigger-percentage">
							Required payment percentage
						</Label>
						<div className="flex items-center gap-2">
							<Input
								id="sales-handoff-trigger-percentage"
								type="number"
								inputMode="numeric"
								min={1}
								max={100}
								step={1}
								value={draft.percentage}
								onChange={(event) =>
									setDraftState({
										...draft,
										percentage: event.target.value,
									})
								}
								aria-invalid={Boolean(validationError)}
								aria-describedby={
									validationError
										? "sales-handoff-trigger-percentage-error"
										: "sales-handoff-trigger-percentage-help"
								}
							/>
							<span className="text-sm text-muted-foreground">%</span>
						</div>
						{validationError ? (
							<p
								id="sales-handoff-trigger-percentage-error"
								role="alert"
								className="text-sm text-destructive"
							>
								{validationError}
							</p>
						) : (
							<p
								id="sales-handoff-trigger-percentage-help"
								className="text-sm text-muted-foreground"
							>
								Use a whole number from 1 through 100.
							</p>
						)}
					</div>
				) : null}
			</SettingsCard>

			<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					Policy revision {persisted.revision}
					{persisted.changedAt
						? ` · Last changed ${formatSalesHandoffTriggerChangedAt(persisted.changedAt)}`
						: " · Using the Fully paid default"}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={!changed || updateSettings.isPending}
						onClick={() => setDraftState(null)}
					>
						Discard
					</Button>
					<Button
						type="button"
						disabled={
							!changed || Boolean(validationError) || updateSettings.isPending
						}
						onClick={() => updateSettings.mutate(input)}
					>
						{updateSettings.isPending ? <Spinner /> : null}
						Save trigger
					</Button>
				</div>
			</div>
		</div>
	);
}
