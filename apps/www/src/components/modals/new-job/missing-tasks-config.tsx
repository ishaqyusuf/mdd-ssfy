import { useJobFormContext } from "@/contexts/job-form-context";
import { AlertTriangle, Clock, Wrench } from "lucide-react";
import { JobSubmitButton } from "./job-submit-button";
import { useJobRole } from "@/hooks/use-job-role";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { Button } from "@gnd/ui/button";
import { useJobFormParams } from "@/hooks/use-job-form-params";

export function MissingTasksConfig({ form }) {
    const { defaultValues } = useJobFormContext();
    const { isAdmin } = useJobRole();
    const { setParams: setInstallCostParams } = useCommunityInstallCostParams();
    const { setParams: setJobFormParams, ...jobFormParams } = useJobFormParams();

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
        setInstallCostParams({
            editCommunityModelInstallCostId: jobFormParams.modelId,
            mode: "v2",
            view: "template-list",
            selectedBuilderTaskId: defaultValues?.builderTaskId || null,
            jobPayload,
        });
        setJobFormParams(null);
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 mb-6 shadow-sm">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-amber-800 dark:text-amber-200 mb-2">
                Task Configuration Missing
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 max-w-sm mb-8 leading-relaxed">
                The task <strong>"{defaultValues?.job?.subtitle}"</strong> for{" "}
                <strong>{defaultValues?.job?.title}</strong> has not been
                configured in the global Install Costs yet.
            </p>

            <div className="w-full max-w-sm space-y-4">
                {isAdmin ? (
                    <Button
                        size="lg"
                        onClick={handleConfigureTask}
                        disabled={!jobFormParams.modelId}
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        <Wrench className="size-5" />
                        Configure Task
                    </Button>
                ) : (
                    <JobSubmitButton
                        Trigger="Request Configuration & Save Draft"
                        size="lg"
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                        form={form}
                        submitAsTaskRequest
                    />
                )}
                <div className="flex items-start gap-2 text-left p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <Clock className="text-amber-500 shrink-0 size-4 mt-0.5" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        {isAdmin
                            ? "This opens Install Cost v2 to configure missing task costs. When you close it, your in-progress job setup will resume automatically."
                            : `This will notify the Admin. Once configuration is complete, the job will move to "Pending" and ${defaultValues?.user?.name} will be alerted to start work.`}
                    </p>
                </div>
            </div>
        </div>
    );
}
