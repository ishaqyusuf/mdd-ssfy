import { Icons } from "@gnd/ui/icons";
import { useJobFormContext } from "@/contexts/job-form-context";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { JobSubmitButton } from "./job-submit-button";

export function MissingTasksConfig({ form }) {
	const { defaultValues } = useJobFormContext();
	const { isAdmin } = useJobRole();
	const { setParams: setInstallCostParams } = useCommunityInstallCostParams();
	const { setParams: setJobFormParams, ...jobFormParams } = useJobFormParams();
	const jobDetails = form.watch("job.description");

	const jobPayload = {
		step: jobFormParams.step ?? null,
		redirectStep: jobFormParams.redirectStep ?? null,
		projectId: jobFormParams.projectId ?? null,
		jobId: jobFormParams.jobId ?? null,
		unitId: jobFormParams.unitId ?? null,
		builderTaskId: jobFormParams.builderTaskId ?? null,
		userId: jobFormParams.userId ?? null,
		modelId: jobFormParams.modelId ?? null,
	};

	const handleConfigureTask = () => {
		if (!jobFormParams.modelId) return;
		const jobBuilderTaskId =
			defaultValues?.builderTaskId || jobFormParams.builderTaskId || null;
		const contractorId =
			jobFormParams.userId ?? defaultValues?.user?.id ?? null;
		setInstallCostParams({
			editCommunityModelInstallCostId: jobFormParams.modelId,
			mode: "v2",
			view: "template-list",
			selectedBuilderTaskId: jobBuilderTaskId,
			requestBuilderTaskId: jobBuilderTaskId,
			contractorId,
			jobId: jobFormParams.jobId ?? null,
			jobPayload,
		});
		setJobFormParams(null);
	};

	return (
		<div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-2xl animate-in zoom-in-95 duration-300">
			<div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 mb-6 shadow-sm">
				<Icons.AlertTriangle size={32} />
			</div>
			<h3 className="text-xl font-black text-amber-800 dark:text-amber-200 mb-2">
				Task Configuration Missing
			</h3>
			<p className="text-sm text-amber-700 dark:text-amber-400 max-w-sm mb-8 leading-relaxed">
				The task <strong>"{defaultValues?.job?.subtitle}"</strong> for{" "}
				<strong>{defaultValues?.job?.title}</strong> has not been configured in
				the global Install Costs yet.
			</p>

			<div className="w-full max-w-sm space-y-4">
				{isAdmin ? (
					<Button
						size="lg"
						onClick={handleConfigureTask}
						disabled={!jobFormParams.modelId}
						className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
					>
						<Icons.Wrench className="size-5" />
						Configure Task
					</Button>
				) : (
					<div className="space-y-4">
						<div className="space-y-2 text-left">
							<Label
								htmlFor="request-task-config-details"
								className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200"
							>
								Add Job Details
							</Label>
							<Textarea
								id="request-task-config-details"
								placeholder="Describe the work needed, measurements, special instructions, or anything admin should know before configuring this install task."
								className="min-h-28 border-amber-200 bg-white/90 text-sm text-foreground placeholder:text-muted-foreground dark:border-amber-800 dark:bg-background"
								{...form.register("job.description")}
							/>
							<p className="text-[11px] text-amber-800 dark:text-amber-300">
								Add a quick job summary so the install task can be configured
								correctly.
							</p>
						</div>
						<JobSubmitButton
							Trigger="Request Configuration & Save Draft"
							size="lg"
							className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
							form={form}
							submitAsTaskRequest
							disabled={!jobDetails?.trim()}
						/>
					</div>
				)}
				<div className="flex items-start gap-2 text-left p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
					<Icons.Clock className="text-amber-500 shrink-0 size-4 mt-0.5" />
					<p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
						{isAdmin
							? "This opens Install Cost v2 to configure missing task costs. When you close it, your in-progress job setup will resume automatically."
							: "Your task configuration request will be saved with this job. Admin will review it and notify you when this job is ready."}
					</p>
				</div>
			</div>
		</div>
	);
}
