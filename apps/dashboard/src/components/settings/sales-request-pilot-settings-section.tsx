"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type {
	SalesRequestPilotSettings,
	SalesRequestPilotSettingsSource,
} from "@gnd/settings";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";
import { useQuery } from "@gnd/ui/tanstack";
import { useMemo } from "react";
import { SettingsCard } from "./settings-card";

type Employee = RouterOutputs["hrm"]["getEmployees"]["data"][number];
type ActiveEmployee = Pick<Employee, "id" | "name" | "email" | "role">;

export type SalesRequestPilotDraft = Pick<
	SalesRequestPilotSettings,
	"enabled" | "cohortUserIds" | "reviewerUserIds"
>;

type PilotUserSelectionProps = {
	label: string;
	description: string;
	ids: readonly number[];
	maxSelected: number;
	users: readonly ActiveEmployee[];
	isLoading: boolean;
	disabled: boolean;
	onChange: (ids: number[]) => void;
};

type PilotStatus = {
	label: string;
	variant: "outline" | "success" | "destructive";
	description: string;
};

function employeeName(employee: ActiveEmployee) {
	return (
		employee.name?.trim() || employee.email?.trim() || `User ${employee.id}`
	);
}

function employeeOptionLabel(employee: ActiveEmployee) {
	const name = employeeName(employee);
	return employee.email?.trim() && employee.email.trim() !== name
		? `${name} · ${employee.email.trim()}`
		: name;
}

function sameIds(left: readonly number[], right: readonly number[]) {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function getPilotStatus({
	pilot,
	source,
	featureEnabled,
	staleUserIds,
}: {
	pilot: SalesRequestPilotDraft;
	source: SalesRequestPilotSettingsSource;
	featureEnabled: boolean;
	staleUserIds: number[];
}): PilotStatus {
	if (source === "invalid") {
		return {
			label: "Fail-closed: invalid settings",
			variant: "destructive",
			description:
				"The stored pilot record is invalid, so request generation remains unavailable until it is replaced.",
		};
	}
	if (!featureEnabled) {
		return {
			label: "Disabled by server kill switch",
			variant: "outline",
			description:
				"The server-wide feature flag is off. Saving this pilot does not enable provider calls by itself.",
		};
	}
	if (!pilot.enabled) {
		return {
			label: "Disabled",
			variant: "outline",
			description:
				"No sales rep can use the text pilot while it is disabled. Disabling remains available for emergency rollback.",
		};
	}
	if (pilot.cohortUserIds.length === 0 || pilot.reviewerUserIds.length === 0) {
		return {
			label: "Fail-closed: incomplete audience",
			variant: "destructive",
			description:
				"An enabled pilot requires at least one named sales rep and one named reviewer.",
		};
	}
	if (staleUserIds.length > 0) {
		return {
			label: "Fail-closed: inactive users",
			variant: "destructive",
			description:
				"One or more selected users are no longer active. Remove or replace them before enabling the pilot.",
		};
	}
	return {
		label: "Enabled for named cohort",
		variant: "success",
		description:
			"Only named cohort members and reviewers with native Sales authority can generate, review, and apply previews.",
	};
}

function PilotUserSelection({
	label,
	description,
	ids,
	maxSelected,
	users,
	isLoading,
	disabled,
	onChange,
}: PilotUserSelectionProps) {
	const usersById = useMemo(
		() => new Map(users.map((user) => [user.id, user])),
		[users],
	);
	const selectedIds = useMemo(() => new Set(ids), [ids]);
	const selectedUsers = ids.map((id) => {
		const employee = usersById.get(id);
		return {
			id,
			label: employee ? employeeName(employee) : `User ${id}`,
			employee,
		};
	});
	const availableUsers = users.filter((user) => !selectedIds.has(user.id));
	const reachedLimit = ids.length >= maxSelected;

	return (
		<div className="space-y-3">
			<div>
				<Label>{label}</Label>
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="flex flex-wrap gap-2" aria-live="polite">
				{selectedUsers.length ? (
					selectedUsers.map(({ id, label: selectedLabel, employee }) => (
						<div
							key={id}
							className="flex max-w-full items-center gap-1 rounded-full border bg-muted/30 py-1 pl-3 pr-1 text-sm"
						>
							<span className="max-w-[240px] truncate" title={selectedLabel}>
								{selectedLabel}
							</span>
							{!employee ? (
								<Badge
									variant="destructive"
									className="px-1.5 py-0 text-[10px]"
								>
									Unavailable
								</Badge>
							) : null}
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="rounded-full"
								disabled={disabled}
								onClick={() => onChange(ids.filter((value) => value !== id))}
								aria-label={`Remove ${selectedLabel} from ${label}`}
							>
								<Icons.X />
							</Button>
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground">None selected</p>
				)}
			</div>
			<ComboboxDropdown
				items={availableUsers.map((employee) => ({
					id: String(employee.id),
					label: employeeOptionLabel(employee),
					userId: employee.id,
				}))}
				searchPlaceholder="Search active employees"
				placeholder={`Add ${label.toLowerCase()}`}
				disabled={disabled || isLoading}
				isLoading={isLoading}
				emptyResults="No active employees available"
				Trigger={
					<Button
						type="button"
						variant="outline"
						disabled={
							disabled ||
							isLoading ||
							availableUsers.length === 0 ||
							reachedLimit
						}
						className="w-full justify-start sm:w-auto"
					>
						<Icons.UserPlus className="size-4" />
						{isLoading
							? "Loading active employees…"
							: reachedLimit
								? `Maximum ${maxSelected} selected`
								: `Add ${label.toLowerCase()}`}
					</Button>
				}
				onSelect={(item) => {
					if (reachedLimit) return;
					onChange([...ids, item.userId].sort((a, b) => a - b));
				}}
			/>
			<p className="text-xs text-muted-foreground">
				Maximum {maxSelected} selected for this list.
			</p>
		</div>
	);
}

export function SalesRequestPilotSettingsSection({
	pilot,
	pilotSource,
	featureEnabled,
	draft,
	isSaving,
	onDraftChange,
	onSave,
	onDiscard,
}: {
	pilot: SalesRequestPilotSettings;
	pilotSource: SalesRequestPilotSettingsSource;
	featureEnabled: boolean;
	draft: SalesRequestPilotDraft | null;
	isSaving: boolean;
	onDraftChange: (draft: SalesRequestPilotDraft) => void;
	onSave: (draft: SalesRequestPilotDraft) => void;
	onDiscard: () => void;
}) {
	const trpc = useTRPC();
	const employeesQuery = useQuery(
		trpc.hrm.getEmployees.queryOptions({
			accessStatus: "active",
			size: 200,
		}),
	);
	const users = employeesQuery.data?.data ?? [];
	const selected = draft ?? pilot;
	const staleUserIds = employeesQuery.isSuccess
		? [
				...new Set([...selected.cohortUserIds, ...selected.reviewerUserIds]),
			].filter((id) => !users.some((user) => user.id === id))
		: [];
	const status = getPilotStatus({
		pilot: selected,
		source: pilotSource,
		featureEnabled,
		staleUserIds,
	});
	const missingAudience =
		selected.enabled &&
		(selected.cohortUserIds.length === 0 ||
			selected.reviewerUserIds.length === 0);
	const hasInvalidAudience = selected.enabled && staleUserIds.length > 0;
	const changed =
		pilotSource !== "persisted" ||
		(draft !== null &&
			(draft.enabled !== pilot.enabled ||
				!sameIds(draft.cohortUserIds, pilot.cohortUserIds) ||
				!sameIds(draft.reviewerUserIds, pilot.reviewerUserIds)));
	const saveDisabled =
		!changed || isSaving || missingAudience || hasInvalidAudience;

	const updateDraft = (changes: Partial<SalesRequestPilotDraft>) => {
		onDraftChange({
			enabled: selected.enabled,
			cohortUserIds: selected.cohortUserIds,
			reviewerUserIds: selected.reviewerUserIds,
			...changes,
		});
	};

	return (
		<SettingsCard
			title="Internal text pilot"
			description="Control the pasted-text request-generation pilot. Image input and mailbox connection are intentionally deferred."
		>
			<div className="space-y-6">
				<div className="flex flex-col gap-4 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={status.variant}>{status.label}</Badge>
							<Badge variant="outline">Revision {pilot.revision}</Badge>
						</div>
						<p className="max-w-2xl text-sm text-muted-foreground">
							{status.description}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<Label htmlFor="sales-request-pilot-enabled">Enable pilot</Label>
						<Switch
							id="sales-request-pilot-enabled"
							checked={selected.enabled}
							disabled={isSaving}
							onCheckedChange={(enabled) => updateDraft({ enabled })}
							aria-describedby="sales-request-pilot-safety"
						/>
					</div>
				</div>

				<div
					id="sales-request-pilot-safety"
					className="space-y-1 text-xs text-muted-foreground"
				>
					<p>
						{selected.cohortUserIds.length} cohort user
						{selected.cohortUserIds.length === 1 ? "" : "s"} ·{" "}
						{selected.reviewerUserIds.length} reviewer
						{selected.reviewerUserIds.length === 1 ? "" : "s"}
					</p>
					<p>
						Last changed: {pilot.changedAt ?? "never"} · Changes are revisioned
						and provider credentials are not stored here.
					</p>
				</div>

				<div className="grid gap-6 border-t pt-6 lg:grid-cols-2">
					<PilotUserSelection
						label="Pilot cohort"
						description="Sales reps allowed to generate pasted-text previews."
						ids={selected.cohortUserIds}
						maxSelected={100}
						users={users}
						isLoading={employeesQuery.isPending}
						disabled={isSaving}
						onChange={(cohortUserIds) => updateDraft({ cohortUserIds })}
					/>
					<PilotUserSelection
						label="Reviewers"
						description="Named users allowed to review and apply generated proposals."
						ids={selected.reviewerUserIds}
						maxSelected={25}
						users={users}
						isLoading={employeesQuery.isPending}
						disabled={isSaving}
						onChange={(reviewerUserIds) => updateDraft({ reviewerUserIds })}
					/>
				</div>

				{employeesQuery.isError ? (
					<p className="text-sm text-destructive" role="alert">
						Active employees could not be refreshed. Existing selections remain
						removable, and disabling the pilot is still available.
					</p>
				) : null}
				{missingAudience ? (
					<p className="text-sm text-destructive" role="alert">
						Select at least one cohort user and one reviewer before enabling the
						pilot.
					</p>
				) : null}
				{hasInvalidAudience ? (
					<p className="text-sm text-destructive" role="alert">
						Remove unavailable users before enabling the pilot. Disabling
						remains safe even when old IDs are no longer active.
					</p>
				) : null}

				<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
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
						disabled={saveDisabled}
						onClick={() =>
							onSave({
								enabled: selected.enabled,
								cohortUserIds: [...selected.cohortUserIds],
								reviewerUserIds: [...selected.reviewerUserIds],
							})
						}
					>
						{isSaving ? <Icons.Loader2 className="animate-spin" /> : null}
						Save pilot settings
					</Button>
				</div>
			</div>
		</SettingsCard>
	);
}
