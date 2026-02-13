import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Layers, PenTool } from "lucide-react";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@gnd/ui/skeleton";
import { StepTitle } from "./step-title";
import { SubHeader } from "./sub-header";
export function TaskSelectStep({}) {
    const { setParams, ...params } = useJobFormParams();
    const { data, isPending, refetch, isEnabled } = useQuery(
        _trpc.community.getBuilderTasksForProject.queryOptions(
            {
                projectId: params.projectId!,
                homeId: params.unitId!,
            },
            {
                enabled: !!params.projectId && !!params.unitId,
            },
        ),
    );

    const tasks = data || [];
    const { query, results, setQuery, clear } = useSearch({
        items: tasks,
    });

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
            <LoadingSkeleton isPending={isPending}>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            setParams({
                                taskId: -1,
                                step: params.redirectStep || params.step + 1,
                                redirectStep: null,
                            });
                        }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed text-left transition-all group ${params.taskId == -1 ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary hover:bg-primary/5"}`}
                    >
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <PenTool size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-primary">
                                Custom Task
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Create a one-off job with manual pricing
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-primary" />
                    </button>

                    {results.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setParams({
                                    taskId: item.id,
                                    step:
                                        params.redirectStep || params.step + 1,
                                    redirectStep: null,
                                });
                                // handleNext();
                            }}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${params.taskId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
                        >
                            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                                <Layers size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-foreground">
                                        {item.taskName}
                                    </p>
                                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">
                                        ${item.estimatedCost.toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {/* {item.} */}
                                </p>
                            </div>
                            <ChevronRight
                                size={16}
                                className="text-muted-foreground"
                            />
                        </button>
                    ))}
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

