"use client";

import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { Switch } from "@gnd/ui/switch";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type SettingsMeta = {
	allowCustomProject: boolean;
	allowCustomJobs: boolean;
	showTaskQty: boolean;
};
const options: {
	key: keyof SettingsMeta;
	label: string;
	description: string;
}[] = [
	{
		key: "showTaskQty",
		label: "Show task quantity details",
		description:
			"Show configured rates, maximum quantities and totals in the contractor web form.",
	},
	{
		key: "allowCustomJobs",
		label: "Allow custom jobs",
		description: "Offer one-off tasks with a description and manual pricing.",
	},
	{
		key: "allowCustomProject",
		label: "Allow custom projects",
		description:
			"Offer a projectless custom job with a project name and manual pricing.",
	},
];
function readSettings(meta?: Partial<SettingsMeta> | null): SettingsMeta {
	return {
		showTaskQty: !!meta?.showTaskQty,
		allowCustomJobs: !!meta?.allowCustomJobs,
		allowCustomProject: !!meta?.allowCustomProject,
	};
}

export function JobSettingsSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const {
		data: jobSettings,
		isPending,
		isError,
	} = useQuery(
		trpc.settings.getJobSettings.queryOptions(undefined, { enabled: open }),
	);
	const [meta, setMeta] = useState<SettingsMeta>(readSettings());
	useEffect(() => {
		if (jobSettings) setMeta(readSettings(jobSettings.meta));
	}, [jobSettings]);
	const updateSetting = useMutation(
		trpc.settings.updateSetting.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.settings.getJobSettings.queryKey(),
				});
				toast({ title: "Job settings saved", variant: "success" });
				setOpen(false);
			},
			onError() {
				toast({ title: "Unable to save job settings", variant: "destructive" });
			},
		}),
	);
	return (
		<>
			<Button
				variant="outline"
				onClick={() => {
					setMeta(readSettings(jobSettings?.meta));
					setOpen(true);
				}}
			>
				<Icons.Settings2 data-icon="inline-start" />
				Settings
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent
					className="flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-[560px]"
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						document
							.querySelector<HTMLElement>("[data-job-settings-title]")
							?.focus();
					}}
				>
					<SheetHeader className="shrink-0 p-5 pr-12 text-left">
						<SheetTitle data-job-settings-title tabIndex={-1}>
							Job settings
						</SheetTitle>
						<SheetDescription>
							Control the contractor web form and the work they can submit.
						</SheetDescription>
					</SheetHeader>
					<div className="min-h-0 flex-1 overflow-y-auto p-5 pt-0">
						{isError ? (
							<Alert variant="destructive">
								<AlertDescription>
									Job settings could not load. Close this panel and try again.
								</AlertDescription>
							</Alert>
						) : isPending ? (
							<div className="flex flex-col gap-4">
								<Skeleton className="h-24 w-full" />
								<Skeleton className="h-24 w-full" />
								<Skeleton className="h-24 w-full" />
							</div>
						) : (
							<FieldSet>
								<FieldLegend variant="label">
									Submission preferences
								</FieldLegend>
								<FieldGroup className="gap-0 rounded-lg border">
									{options.map((option) => (
										<Field
											key={option.key}
											orientation="horizontal"
											className="border-b p-4 last:border-b-0"
											data-disabled={updateSetting.isPending}
										>
											<FieldContent>
												<FieldLabel htmlFor={`job-setting-${option.key}`}>
													{option.label}
												</FieldLabel>
												<FieldDescription
													id={`job-setting-${option.key}-description`}
												>
													{option.description}
												</FieldDescription>
											</FieldContent>
											<Switch
												id={`job-setting-${option.key}`}
												aria-describedby={`job-setting-${option.key}-description`}
												checked={meta[option.key]}
												disabled={updateSetting.isPending}
												onCheckedChange={(checked) =>
													setMeta((current) => ({
														...current,
														[option.key]: checked,
													}))
												}
											/>
										</Field>
									))}
								</FieldGroup>
								<Alert>
									<Icons.FileText />
									<AlertDescription>
										<span className="font-medium">Contractor form preview</span>
										<ul className="mt-2 flex flex-col gap-1">
											<li>
												{meta.showTaskQty
													? "Rates, maximum quantities and totals are visible."
													: "Task quantities can be entered with pricing details hidden."}
											</li>
											<li>
												{meta.allowCustomJobs
													? "Custom tasks are available."
													: "Configured builder tasks are offered."}
											</li>
											<li>
												{meta.allowCustomProject
													? "A named custom project can be submitted."
													: "An existing project and unit are required."}
											</li>
										</ul>
									</AlertDescription>
								</Alert>
							</FieldSet>
						)}
					</div>
					<SheetFooter className="shrink-0 flex-row gap-2 border-t p-4">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={updateSetting.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={() =>
								updateSetting.mutate({
									type: "jobs-settings",
									meta,
									updateType: "full",
								})
							}
							disabled={isPending || isError || updateSetting.isPending}
						>
							{updateSetting.isPending ? "Saving…" : "Save settings"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
