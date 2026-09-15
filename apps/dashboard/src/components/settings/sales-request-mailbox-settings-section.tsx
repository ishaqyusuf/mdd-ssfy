"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";
import { useQuery } from "@gnd/ui/tanstack";
import { useMemo } from "react";
import { SettingsCard } from "./settings-card";

type Employee = RouterOutputs["hrm"]["getEmployees"]["data"][number];
type ActiveEmployee = Pick<Employee, "id" | "name" | "email">;
type SalesRequestMailboxPolicy =
	RouterOutputs["salesRequest"]["getAISettings"]["requestGeneration"]["mailbox"];

export type SalesRequestMailboxPolicyDraft = Pick<
	SalesRequestMailboxPolicy,
	| "enabled"
	| "supportedProviders"
	| "eligibleUserIds"
	| "retentionDays"
	| "maximumAutomationMode"
	| "emergencyDisabled"
	| "allowAttachments"
	| "maxAttachmentBytes"
>;

function sameValues<T extends string | number>(
	left: readonly T[],
	right: readonly T[],
) {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function employeeName(employee: ActiveEmployee) {
	return (
		employee.name?.trim() || employee.email?.trim() || `User ${employee.id}`
	);
}

export function SalesRequestMailboxSettingsSection({
	policy,
	draft,
	isSaving,
	onDraftChange,
	onSave,
	onDiscard,
}: {
	policy: SalesRequestMailboxPolicy;
	draft: SalesRequestMailboxPolicyDraft | null;
	isSaving: boolean;
	onDraftChange: (draft: SalesRequestMailboxPolicyDraft) => void;
	onSave: (draft: SalesRequestMailboxPolicyDraft) => void;
	onDiscard: () => void;
}) {
	const trpc = useTRPC();
	const employeesQuery = useQuery(
		trpc.hrm.getEmployees.queryOptions({ accessStatus: "active", size: 200 }),
	);
	const users = employeesQuery.data?.data ?? [];
	const selected = draft ?? policy;
	const usersById = useMemo(
		() => new Map(users.map((user) => [user.id, user])),
		[users],
	);
	const selectedIds = useMemo(
		() => new Set(selected.eligibleUserIds),
		[selected.eligibleUserIds],
	);
	const staleUserIds = employeesQuery.isSuccess
		? selected.eligibleUserIds.filter((id) => !usersById.has(id))
		: [];
	const changed =
		draft !== null &&
		(draft.enabled !== policy.enabled ||
			draft.emergencyDisabled !== policy.emergencyDisabled ||
			draft.retentionDays !== policy.retentionDays ||
			!sameValues(draft.supportedProviders, policy.supportedProviders) ||
			!sameValues(draft.eligibleUserIds, policy.eligibleUserIds));
	const invalid =
		selected.enabled &&
		(selected.supportedProviders.length === 0 ||
			selected.eligibleUserIds.length === 0 ||
			staleUserIds.length > 0);

	const update = (changes: Partial<SalesRequestMailboxPolicyDraft>) => {
		onDraftChange({
			enabled: selected.enabled,
			supportedProviders: selected.supportedProviders,
			eligibleUserIds: selected.eligibleUserIds,
			retentionDays: selected.retentionDays,
			maximumAutomationMode: "manual",
			emergencyDisabled: selected.emergencyDisabled,
			allowAttachments: false,
			maxAttachmentBytes: 0,
			...changes,
		});
	};

	const toggleProvider = (provider: "gmail" | "microsoft-graph") => {
		const next = selected.supportedProviders.includes(provider)
			? selected.supportedProviders.filter((item) => item !== provider)
			: [...selected.supportedProviders, provider].sort();
		update({ supportedProviders: next });
	};

	return (
		<SettingsCard
			title="Mailbox requests"
			description="Read customer requests."
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-center gap-5">
					<div className="flex items-center gap-2">
						<Switch
							id="sales-request-mailbox-enabled"
							checked={selected.enabled}
							disabled={isSaving}
							onCheckedChange={(enabled) => update({ enabled })}
						/>
						<Label htmlFor="sales-request-mailbox-enabled">Enabled</Label>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							id="sales-request-mailbox-paused"
							checked={selected.emergencyDisabled}
							disabled={isSaving}
							onCheckedChange={(emergencyDisabled) =>
								update({ emergencyDisabled })
							}
						/>
						<Label htmlFor="sales-request-mailbox-paused">Paused</Label>
					</div>
				</div>

				<div className="grid gap-5 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Providers</Label>
						<div className="flex gap-2">
							{(
								[
									["gmail", "Gmail"],
									["microsoft-graph", "Microsoft"],
								] as const
							).map(([provider, label]) => (
								<Button
									key={provider}
									type="button"
									variant={
										selected.supportedProviders.includes(provider)
											? "default"
											: "outline"
									}
									onClick={() => toggleProvider(provider)}
									disabled={isSaving}
								>
									{label}
								</Button>
							))}
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="sales-request-mailbox-retention">
							Retention days
						</Label>
						<Input
							id="sales-request-mailbox-retention"
							type="number"
							min={1}
							max={90}
							value={selected.retentionDays}
							onChange={(event) =>
								update({
									retentionDays: Math.min(
										90,
										Math.max(1, Number(event.target.value) || 1),
									),
								})
							}
							className="max-w-28"
							disabled={isSaving}
						/>
					</div>
				</div>

				<div className="space-y-3 border-t pt-5">
					<Label>Employees</Label>
					<div className="flex flex-wrap gap-2">
						{selected.eligibleUserIds.map((id) => {
							const user = usersById.get(id);
							const label = user ? employeeName(user) : `User ${id}`;
							return (
								<Badge key={id} variant={user ? "secondary" : "destructive"}>
									{label}
									<button
										type="button"
										onClick={() =>
											update({
												eligibleUserIds: selected.eligibleUserIds.filter(
													(value) => value !== id,
												),
											})
										}
										className="ml-1 rounded-sm"
										aria-label={`Remove ${label}`}
									>
										<Icons.X className="size-3" />
									</button>
								</Badge>
							);
						})}
					</div>
					<ComboboxDropdown
						items={users
							.filter((user) => !selectedIds.has(user.id))
							.map((user) => ({
								id: String(user.id),
								label: employeeName(user),
								userId: user.id,
							}))}
						searchPlaceholder="Search employees"
						placeholder="Add employee"
						disabled={isSaving || employeesQuery.isPending}
						isLoading={employeesQuery.isPending}
						emptyResults="No employees available"
						Trigger={
							<Button type="button" variant="outline" disabled={isSaving}>
								<Icons.UserPlus className="size-4" />
								Add employee
							</Button>
						}
						onSelect={(item) =>
							update({
								eligibleUserIds: [
									...selected.eligibleUserIds,
									item.userId,
								].sort((a, b) => a - b),
							})
						}
					/>
				</div>

				{invalid ? (
					<p role="alert" className="text-sm text-destructive">
						Select a provider and an active employee before enabling.
					</p>
				) : null}

				<div className="flex justify-end gap-2 border-t pt-5">
					<Button
						type="button"
						variant="outline"
						disabled={!changed || isSaving}
						onClick={onDiscard}
					>
						Discard
					</Button>
					<Button
						type="button"
						disabled={!changed || invalid || isSaving}
						onClick={() =>
							onSave({
								enabled: selected.enabled,
								supportedProviders: [...selected.supportedProviders],
								eligibleUserIds: [...selected.eligibleUserIds],
								retentionDays: selected.retentionDays,
								maximumAutomationMode: "manual",
								emergencyDisabled: selected.emergencyDisabled,
								allowAttachments: false,
								maxAttachmentBytes: 0,
							})
						}
					>
						{isSaving ? (
							<Icons.Loader2 className="size-4 animate-spin" />
						) : null}
						Save
					</Button>
				</div>
			</div>
		</SettingsCard>
	);
}
