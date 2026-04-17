import { Icons } from "@gnd/ui/icons";
import { _trpc } from "@/components/static-trpc";
import { useJobFormContext } from "@/contexts/job-form-context";
import { SearchInput } from "@/components/search-input";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { useQuery } from "@tanstack/react-query";
import { StepTitle } from "./step-title";
import { SubHeader } from "./sub-header";
export function TaskSelectStep({}) {
    const { setParams, ...params } = useJobFormParams();
    const { setParams: setBuilderParams } = useBuilderParams();
    const { isAdmin } = useJobRole();
    const { state } = useJobFormContext();
    const canLoadTasks = !!params.projectId;
    const { data, isPending } = useQuery(
        _trpc.community.getBuilderTasksForProject.queryOptions(
            {
                projectId: params.projectId!,
                homeId: params.unitId || -1,
            },
            {
                enabled: canLoadTasks,
            },
        ),
    );
    const { data: projects } = useQuery(
        _trpc.community.projectsList.queryOptions(),
    );

    const tasks = data || [];
    const { query, results, setQuery } = useSearch({
        items: tasks,
    });
    const selectedProject = projects?.find((p) => p.id === params.projectId);
    const builderId = selectedProject?.builderId;
    const noTasksConfigured = canLoadTasks && !isPending && tasks.length === 0;

    const openBuilderTaskConfig = () => {
        if (!builderId) return;
        setBuilderParams({
            openBuilderId: builderId,
            jobPayload: {
                step: params.step ?? null,
                redirectStep: params.redirectStep ?? null,
                projectId: params.projectId ?? null,
                jobId: params.jobId ?? null,
                unitId: params.unitId ?? null,
                builderTaskId: params.builderTaskId ?? null,
                userId: params.userId ?? null,
                modelId: params.modelId ?? null,
            },
        });
        setParams(null);
    };

    return (
        <div className="space-y-4">
            <StepTitle title="Select Task" />
            <SubHeader>
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search tasks..."
                />
            </SubHeader>
            {!canLoadTasks && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Select a project first to load available tasks.
                </div>
            )}
            <LoadingSkeleton isPending={isPending}>
                <div className="space-y-2">
                    {state.allowCustomJobs ? (
                        <button
                            onClick={() => {
                                setParams({
                                    builderTaskId: -1,
                                    step: params.redirectStep || params.step + 1,
                                    redirectStep: null,
                                });
                            }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed text-left transition-all group ${params.builderTaskId == -1 ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary hover:bg-primary/5"}`}
                        >
                            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Icons.PenTool size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-primary">
                                    Custom Task
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Create a one-off job with manual pricing
                                </p>
                            </div>
                            <Icons.ChevronRight size={16} className="text-primary" />
                        </button>
                    ) : null}

                    {noTasksConfigured && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                                    <Icons.AlertTriangle className="size-4" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">
                                            No Builder Tasks Configured
                                        </p>
                                        <p className="text-xs text-amber-800">
                                            This project&apos;s builder has no
                                            task templates yet.
                                        </p>
                                    </div>
                                    {isAdmin ? (
                                        <Button
                                            size="sm"
                                            onClick={openBuilderTaskConfig}
                                            disabled={!builderId}
                                            className="bg-amber-700 text-white hover:bg-amber-800"
                                        >
                                            <Icons.Wrench className="mr-2 size-4" />
                                            Configure Builder Tasks
                                        </Button>
                                    ) : (
                                        <p className="text-xs text-amber-800">
                                            Ask an admin to configure builder
                                            tasks before selecting one here.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {results.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setParams({
                                    builderTaskId: item.id,
                                    step:
                                        params.redirectStep || params.step + 1,
                                    redirectStep: null,
                                });
                                // handleNext();
                            }}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${params.builderTaskId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
                        >
                            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                                <Icons.Layers size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-foreground">
                                        {item.taskName}
                                    </p>
                                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">
                                        {/* ${item.estimatedCost.toFixed(2)} */}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {/* {item.} */}
                                </p>
                            </div>
                            <Icons.ChevronRight
                                size={16}
                                className="text-muted-foreground"
                            />
                        </button>
                    ))}
                    {canLoadTasks &&
                        !noTasksConfigured &&
                        !results.length && (
                        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                            No matching tasks found.
                        </div>
                    )}
                </div>
            </LoadingSkeleton>
        </div>
    );
}

function LoadingSkeleton({ isPending, children }) {
    if (!isPending) return <>{children}</>;
    return (
        <div className="space-y-2">
            {[...Array(4)].map((item, itemId) => (
                <div
                    key={itemId}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md border-border bg-card hover:bg-muted/50}`}
                >
                    <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                        <Skeleton className="size-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <Skeleton className="w-1/2 h-4 mb-2" />
                            <Skeleton className="w-1/6 h-3" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {/* {item.} */}
                        </p>
                    </div>
                    <Skeleton className="size-4 text-muted-foreground" />
                </div>
            ))}
        </div>
    );
}
