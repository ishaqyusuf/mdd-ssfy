"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Separator } from "@gnd/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type SettingsMeta = {
	allowCustomJobs: boolean;
	showTaskQty: boolean;
};

export function JobSettingsSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { data: jobSettings, isPending } = useQuery(
		trpc.settings.getJobSettings.queryOptions(),
	);
	const [meta, setMeta] = useState<SettingsMeta>({
		allowCustomJobs: false,
		showTaskQty: false,
	});

	useEffect(() => {
		if (!jobSettings) return;
		setMeta({
			allowCustomJobs: !!jobSettings.meta?.allowCustomJobs,
			showTaskQty: !!jobSettings.meta?.showTaskQty,
		});
	}, [jobSettings]);

	const updateSetting = useMutation(
		trpc.settings.updateSetting.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.settings.getJobSettings.queryKey(),
				});
				toast({
					title: "Job settings saved",
					variant: "success",
				});
				setOpen(false);
			},
		}),
	);

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				<Icons.Settings2 className="mr-2 h-4 w-4" />
				<span>Settings</span>
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="w-full sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Job Settings</SheetTitle>
						<SheetDescription>
							Control what contractors can submit and how task quantities are
							displayed in the web job flow.
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-6 py-6">
						<div className="space-y-3 rounded-xl border border-border bg-card p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<Label htmlFor="job-setting-show-task-qty">
										Show task qty details
									</Label>
									<p className="text-sm text-muted-foreground">
										Show rate, max qty, and totals to contractors in the web job
										submit form.
									</p>
								</div>
								<Checkbox
									id="job-setting-show-task-qty"
									checked={meta.showTaskQty}
									onCheckedChange={(checked) =>
										setMeta((current) => ({
											...current,
											showTaskQty: !!checked,
										}))
									}
								/>
							</div>
						</div>

						<div className="space-y-3 rounded-xl border border-border bg-card p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<Label htmlFor="job-setting-allow-custom">
										Allow custom jobs
									</Label>
									<p className="text-sm text-muted-foreground">
										Let contractors choose one-off custom tasks with manual
										pricing.
									</p>
								</div>
								<Checkbox
									id="job-setting-allow-custom"
									checked={meta.allowCustomJobs}
									onCheckedChange={(checked) =>
										setMeta((current) => ({
											...current,
											allowCustomJobs: !!checked,
										}))
									}
								/>
							</div>
						</div>
					</div>

					<Separator />
					<SheetFooter className="mt-4">
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
							disabled={isPending || updateSetting.isPending}
						>
							{updateSetting.isPending ? "Saving..." : "Save Settings"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
