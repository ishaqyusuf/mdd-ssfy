"use client";

import { useTRPC } from "@/trpc/client";
import type { SalesOverviewViewSettings } from "@gnd/settings";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import { SalesSettingsRouteSkeleton } from "./sales-settings-route-skeleton";
import { SettingsCard } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

const OFFICE_OPTIONS = [
	{
		value: "v1",
		label: "Version 1",
		description: "Keep the current General tab for the office.",
	},
	{
		value: "v2",
		label: "Version 2",
		description: "Use the new Split Command Center for the office.",
	},
] as const;

const PREVIEW_OPTIONS = [
	{
		value: "inherit",
		label: "Office default",
		description: "Use whichever version is active for the office.",
	},
	{
		value: "v1",
		label: "Version 1",
		description: "Force the current General tab for Super Admin.",
	},
	{
		value: "v2",
		label: "Version 2",
		description: "Preview the Split Command Center before office rollout.",
	},
] as const;

function VersionChoice({
	label,
	description,
	selected,
}: {
	label: string;
	description: string;
	selected: boolean;
}) {
	return (
		<span className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
			<span className="flex w-full items-center justify-between gap-2">
				<span className="font-medium">{label}</span>
				{selected ? <Badge variant="secondary">Selected</Badge> : null}
			</span>
			<span className="text-xs font-normal text-muted-foreground">
				{description}
			</span>
		</span>
	);
}

export function SalesOverviewViewSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(
		trpc.sales.getSalesOverviewViewSettings.queryOptions(),
	);
	const [draft, setDraft] = useState<SalesOverviewViewSettings | null>(null);
	const settings = draft ?? settingsQuery.data?.settings ?? null;

	const updateSettings = useMutation(
		trpc.sales.updateSalesOverviewViewSettings.mutationOptions({
			async onSuccess(data) {
				setDraft(null);
				queryClient.setQueryData(
					trpc.sales.getSalesOverviewViewSettings.queryKey(),
					data,
				);
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.queryKey(),
				});
				toast({
					title: "Sales Overview rollout saved",
					description:
						"New Sales Overview opens will use the selected General-tab policy.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save Sales Overview rollout",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (settingsQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load Sales Overview settings"
				description="The current General-tab rollout policy could not be loaded."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	if (settingsQuery.isPending || !settings) {
		return <SalesOverviewViewSettingsSkeleton />;
	}

	const persisted = settingsQuery.data.settings;
	const changed =
		settings.officeDefault !== persisted.officeDefault ||
		settings.superAdminPreview !== persisted.superAdminPreview;

	return (
		<div className="flex flex-col gap-8">
			<SettingsCard
				title="Office default"
				description="Choose the General tab every non-Super-Admin employee sees. Existing tabs, links, and actions are unchanged."
			>
				<ToggleGroup
					type="single"
					variant="outline"
					value={settings.officeDefault}
					onValueChange={(officeDefault) => {
						if (officeDefault !== "v1" && officeDefault !== "v2") return;
						setDraft({ ...settings, officeDefault });
					}}
					className="grid w-full grid-cols-1 sm:grid-cols-2"
					aria-label="Office Sales Overview version"
				>
					{OFFICE_OPTIONS.map((option) => (
						<ToggleGroupItem
							key={option.value}
							value={option.value}
							aria-label={option.label}
							className="h-auto min-h-20 justify-start px-4 py-3"
						>
							<VersionChoice
								{...option}
								selected={settings.officeDefault === option.value}
							/>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</SettingsCard>

			<SettingsCard
				title="Super Admin preview"
				description="Choose the General tab active Super Admin users see while evaluating the rollout."
			>
				<ToggleGroup
					type="single"
					variant="outline"
					value={settings.superAdminPreview}
					onValueChange={(superAdminPreview) => {
						if (
							superAdminPreview !== "inherit" &&
							superAdminPreview !== "v1" &&
							superAdminPreview !== "v2"
						)
							return;
						setDraft({ ...settings, superAdminPreview });
					}}
					className="grid w-full grid-cols-1 sm:grid-cols-3"
					aria-label="Super Admin Sales Overview preview version"
				>
					{PREVIEW_OPTIONS.map((option) => (
						<ToggleGroupItem
							key={option.value}
							value={option.value}
							aria-label={option.label}
							className="h-auto min-h-24 justify-start px-4 py-3"
						>
							<VersionChoice
								{...option}
								selected={settings.superAdminPreview === option.value}
							/>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</SettingsCard>

			<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					Changes apply when a Sales Overview is opened or refreshed.
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={!changed || updateSettings.isPending}
						onClick={() => setDraft(null)}
					>
						Discard
					</Button>
					<Button
						type="button"
						disabled={!changed || updateSettings.isPending}
						onClick={() => updateSettings.mutate(settings)}
					>
						{updateSettings.isPending ? <Spinner /> : null}
						Save rollout
					</Button>
				</div>
			</div>
		</div>
	);
}

function SalesOverviewViewSettingsSkeleton() {
	return <SalesSettingsRouteSkeleton cardCount={2} />;
}
