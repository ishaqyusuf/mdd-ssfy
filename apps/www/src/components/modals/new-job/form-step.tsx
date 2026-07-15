import { Icons } from "@gnd/ui/icons";
import { useJobFormContext } from "@/contexts/job-form-context";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { useZodForm } from "@/hooks/use-zod-form";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { type JobFormSchema, jobFormSchema } from "@community/schema";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import Portal from "@gnd/ui/custom/portal";
import { Card, Field, InputGroup, Item } from "@gnd/ui/namespace";
import { Skeleton } from "@gnd/ui/skeleton";
import { handleNumberInput, percentageValue, sum } from "@gnd/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useFieldArray } from "react-hook-form";
import { useEffect } from "react";
import { AdminJobFormContent } from "./admin-job-form-content";
import { InstallTasksList } from "./install-tasks-list";
import { JobSubmitButton } from "./job-submit-button";
import { StepTitle } from "./step-title";

type JobFormDefaults = Partial<JobFormSchema> & {
	builderTaskId?: number | null;
	unit?: JobFormSchema["unit"] & {
		lotBlock?: string | null;
		modelName?: string | null;
		projectAddon?: number | null;
		projectTitle?: string | null;
	};
	user?: JobFormSchema["user"] & {
		name?: string | null;
	};
};

export function FormStep() {
	const { ...params } = useJobFormParams();
	const { formType } = useJobStepInfo();
	const { defaultValues, isPending } = useJobFormContext();
	const isDirectCustomJob = params.builderTaskId === -1;
	const isReadyToLoadForm =
		(isDirectCustomJob ||
			(!!params.unitId && !!params.builderTaskId && !!params.modelId)) &&
		(formType === "submit" || !!params.userId);

	if (!isReadyToLoadForm) {
		return (
			<div className="space-y-4">
				<StepTitle title="Configure Job Details" />
				<div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
					Complete the previous steps first so job details can load.
				</div>
			</div>
		);
	}

	if (isPending || !defaultValues) {
		return (
			<div className="space-y-4">
				<StepTitle title="Configure Job Details" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-1/3" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>
		);
	}
	return (
		<>
			<StepTitle title="Configure Job Details" />
			<FormContent />
		</>
	);
}
function FormContent() {
	const trpc = useTRPC();
	const { defaultValues, markAsComplete, setMarkAsComplete, state } =
		useJobFormContext();
	const { setParams: setJobFormParams, ...params } = useJobFormParams();
	const { formType } = useJobStepInfo();
	const { setParams: setBuilderParams } = useBuilderParams();
	const { data: projects } = useQuery(
		trpc.community.projectsList.queryOptions(),
	);
	const typedDefaultValues = defaultValues as JobFormDefaults | undefined;
	const resolvedDefaultValues = (typedDefaultValues || {}) as Partial<JobFormSchema>;
	const form = useZodForm(jobFormSchema, {
		defaultValues: {
			...resolvedDefaultValues,
			unit:
				params.unitId && params.projectId
					? {
							id: params.unitId,
							projectId: params.projectId,
						}
					: undefined,
			user: {
				id: params.userId ?? typedDefaultValues?.user?.id,
			},
			modelId: params.modelId ?? undefined,
			builderTaskId:
				params.builderTaskId && params.builderTaskId > 0
					? params.builderTaskId
					: undefined,
			job: {
				...resolvedDefaultValues.job,
				isCustom:
					resolvedDefaultValues.job?.isCustom || params.builderTaskId === -1,
			},
		},
	});
	if (!typedDefaultValues) return null;

	//
	const maxPotentialValue =
		typedDefaultValues.job?.tasks?.reduce(
			(sum, task) => sum + (task.rate || 0) * (task.maxQty || 0),
			0,
		) || 0;
	const builderTaskQuantities =
		typedDefaultValues.job?.tasks?.reduce(
			(acc, task) => {
				acc[task.id] = task.qty || 0;
				return acc;
			},
			{} as Record<number, number>,
		) || 0;
	const addonPercentage =
		Number(form.watch("job.meta.addonPercent")) ||
		Number(typedDefaultValues.job?.meta?.addonPercent) ||
		0;
	const addonValue = percentageValue(
		Number(typedDefaultValues.unit?.projectAddon) || 0,
		addonPercentage,
	);
	const isAdminMode = formType === "assign";
	const isSubmitMode = formType === "submit";
	const selectedProject = (projects as Array<{ id: number; builderId?: number | null }> | undefined)?.find(
		(project) => project.id === params.projectId,
	);
	const builderId = selectedProject?.builderId;
	const isProjectlessCustomJob =
		params.builderTaskId === -1 && !params.projectId;

	const isCustomTask = form.watch("job.isCustom");
	const customProjectTitle = form.watch("job.title");
	const jobTasks = form.watch("job.tasks");
	// const { fields: jobTasks } = useFieldArray({
	//     control: form.control,
	//     name: "job.tasks",
	// });
	const [additionalCost, isCustom] = form.watch([
		"job.meta.additional_cost",
		"job.isCustom",
	]);
	const tasksSubTotal = sum(
		jobTasks?.map((task) => (task.rate || 0) * (task.qty || 0)),
	);
	const total = sum([
		tasksSubTotal,
		addonValue,
		isCustom ? additionalCost || 0 : 0,
	]);
	const openBuilderForm = async () => {
		if (!builderId) return;
		const jobPayload = {
			step: params.step ?? null,
			redirectStep: params.redirectStep ?? null,
			projectId: params.projectId ?? null,
			jobId: params.jobId ?? null,
			unitId: params.unitId ?? null,
			builderTaskId: params.builderTaskId ?? null,
			userId: params.userId ?? null,
			modelId: params.modelId ?? null,
		};
		await setJobFormParams(null);
		setBuilderParams({
			openBuilderId: builderId,
			jobPayload,
		});
	};

	useEffect(() => {
		if (isProjectlessCustomJob) {
			if (state.allowCustomProject) return;
			void setJobFormParams({
				builderTaskId: null,
				step: Math.max(1, (params.step || 1) - 1),
			});
			return;
		}
		if (params.builderTaskId === -1) {
			if (state.allowCustomJobs) return;
			void setJobFormParams({
				builderTaskId: null,
				step: Math.max(1, (params.step || 1) - 1),
			});
			return;
		}
		if (state.allowCustomJobs) return;
		if (!params.builderTaskId) return;
		form.setValue("job.isCustom", false);
	}, [
		form,
		params.builderTaskId,
		isProjectlessCustomJob,
		params.projectId,
		params.step,
		setJobFormParams,
		state.allowCustomProject,
		state.allowCustomJobs,
	]);

	return (
		<>
			<div className="space-y-6 h-full flex flex-col">
				<div className="flex flex-wrap gap-2 text-xs">
					<span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
						<Icons.User className="size-3" />{" "}
						{typedDefaultValues.user?.name || "Unknown User"}
					</span>
					<span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
						<Icons.Building2 className="size-3" />{" "}
						{isProjectlessCustomJob
							? customProjectTitle?.trim() || "Custom Project"
							: params.builderTaskId === -1
								? "Custom"
							: typedDefaultValues.unit?.projectTitle || "Unknown Project"}
					</span>
					{params.builderTaskId === -1 ? null : (
						<span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
							<Icons.Home className="size-3" />
							{`${typedDefaultValues.unit?.modelName} ${typedDefaultValues.unit?.lotBlock}`}
						</span>
					)}
				</div>
				<div className="flex-1 overflow-y-auto pr-2 space-y-6">
					{params.builderTaskId === -1 || !state.allowCustomJobs ? null : (
						<div className="space-y-2">
							<Controller
								control={form.control}
								name="job.isCustom"
								render={({ field }) => (
									<Field orientation="horizontal">
										<Checkbox
											disabled={params.builderTaskId === -1}
											checked={field.value}
											onCheckedChange={field.onChange}
											id="isCustomTask"
										/>
										<Field.Content>
											<Field.Label htmlFor="isCustomTask">
												Is this a custom task?
											</Field.Label>
											<Field.Description>
												Custom tasks are not based on builder templates and
												require a manual cost input.
											</Field.Description>
										</Field.Content>
									</Field>
								)}
							/>
						</div>
					)}
					{isCustomTask || params.builderTaskId === -1 ? (
						/* Custom Task Form */
						<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
							{isProjectlessCustomJob ? (
								<div className="space-y-2">
									<Controller
										control={form.control}
										name="job.title"
										render={({ field, fieldState }) => (
											<Field>
												<Field.Label>Project Name</Field.Label>
												<InputGroup
													className={cn(
														fieldState.error && "border-destructive",
													)}
												>
													<InputGroup.Input
														{...field}
														value={field.value || ""}
														onChange={(event) => {
															field.onChange(event);
															if (fieldState.error) {
																form.clearErrors("job.title");
															}
														}}
														placeholder="Enter project name"
													/>
												</InputGroup>
												{fieldState.error?.message ? (
													<Field.Description className="text-destructive">
														{fieldState.error.message}
													</Field.Description>
												) : null}
											</Field>
										)}
									/>
								</div>
							) : null}
							<div className="space-y-2">
								<Controller
									control={form.control}
									name="job.description"
									render={({ field, fieldState }) => (
										<Field>
											<Field.Label>Job Description</Field.Label>
											<InputGroup
												className={cn(fieldState.error && "border-destructive")}
											>
												<InputGroup.TextArea
													{...field}
													className={cn("min-h-[100px] resize-none")}
													placeholder="Additional instructions for the custom task..."
												/>
											</InputGroup>
										</Field>
									)}
								/>
							</div>

							<div className="space-y-2">
								<Controller
									control={form.control}
									name="job.meta.additional_cost"
									render={({ field, fieldState }) => (
										<Field>
											<Field.Label>Total Cost</Field.Label>
											<InputGroup
												className={cn(fieldState.error && "border-destructive")}
											>
												<InputGroup.Addon>
													<span className="text-muted-foreground">$</span>
												</InputGroup.Addon>
												<InputGroup.Input
													{...field}
													onChange={(e) =>
														field.onChange(handleNumberInput(e.target.value))
													}
													type="number"
												/>
											</InputGroup>
										</Field>
									)}
								/>
							</div>
						</div>
					) : (
						/* Builder Task Form */
						<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
							{/* Total Estimate Block */}
							<AdminJobFormContent>
								<div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
									<div className="flex flex-col">
										<span className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
											Total Install Estimate
										</span>
										<span className="text-[10px] text-muted-foreground">
											Calculated based on max quantities
										</span>
									</div>
									<div className="text-2xl font-black text-primary">
										${maxPotentialValue.toFixed(2)}
									</div>
								</div>
							</AdminJobFormContent>

							<InstallTasksList form={form} />

							{/* <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">
                                    Job Description
                                </label>
                                <textarea
                                    className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none resize-none"
                                    placeholder="Additional instructions for the builder task..."
                                    value={jobDescription}
                                    onChange={(e) =>
                                        setJobDescription(e.target.value)
                                    }
                                />
                            </div> */}

							{/* Totals Section */}
							<div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Subtotal</span>
									<span className="font-bold text-foreground">
										${tasksSubTotal}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Add-on ({addonPercentage}%){" "}
										<span className="text-[10px] bg-muted px-1 rounded border border-border">
											Read Only
										</span>
										{isAdminMode ? (
											<Button
												type="button"
												size="xs"
												variant="outline"
												className="ml-2 h-5 px-1.5 text-[10px]"
												onClick={openBuilderForm}
												disabled={!builderId}
											>
												<Icons.Pencil className="size-3" />
												Edit
											</Button>
										) : null}
									</span>
									<span className="font-bold text-foreground">
										${addonValue}
									</span>
								</div>
								<div className="h-px bg-border my-1" />
								<div className="flex justify-between items-center">
									<span className="font-bold text-foreground uppercase text-xs">
										Grand Total
									</span>
									<span className="font-black text-xl text-primary">
										${total}
									</span>
								</div>
							</div>
						</div>
					)}
					<Item variant="outline">
						<Item.Content>
							<Field orientation="horizontal">
								<Checkbox
									id="finder-pref-9k2-sync-folders-nep"
									checked={markAsComplete}
									onCheckedChange={(e) => setMarkAsComplete(!!e)}
								/>
								<Field.Content>
									<Field.Label htmlFor="finder-pref-9k2-sync-folders-nep">
										{isSubmitMode
											? "Mark job as submitted for review."
											: "Mark job as completed."}
									</Field.Label>
									<Field.Description>
										{isSubmitMode
											? "This will submit the job for admin review."
											: "This will set the job status to completed"}
									</Field.Description>
								</Field.Content>
							</Field>
						</Item.Content>
					</Item>
				</div>
			</div>
			<Portal nodeId={"jobActionButton"} noDelay>
				{/* @ts-ignore */}
				<JobSubmitButton form={form} />
			</Portal>
		</>
	);
}
