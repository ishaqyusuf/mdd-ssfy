import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, DollarSign, Home, Info } from "lucide-react";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@gnd/ui/skeleton";
import { StepTitle } from "./step-title";
import { SubHeader } from "./sub-header";
export function UnitSelectStep({}) {
    const { setParams, ...params } = useJobFormParams();
    const { data, isPending } = useQuery(
        _trpc.community.getProjectUnitsWithJobStats.queryOptions(
            {
                projectId: params.projectId!,
            },
            {
                enabled: !!params.projectId,
            },
        ),
    );

    const units = data || [];
    const { query, results, setQuery } = useSearch({
        items: units,
    });
    const hasProject = !!params.projectId;
    const hasNoUnits = hasProject && !isPending && units.length === 0;
    const hasNoMatches = hasProject && !isPending && units.length > 0 && !results.length;

    return (
        <div className="space-y-4">
            <StepTitle title="Select Unit" />
            <SubHeader>
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search units..."
                />
            </SubHeader>
            {!hasProject && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Select a project first to load available units.
                </div>
            )}
            <LoadingSkeleton isPending={isPending}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hasNoUnits && (
                        <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                            <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Info className="size-4" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                No units found for this project
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Add units to this project to continue job assignment.
                            </p>
                        </div>
                    )}
                    {results.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                // console.log(item);
                                // return;
                                setParams({
                                    unitId: item.id,
                                    modelId: item.modelId,
                                    step:
                                        params.redirectStep || params.step + 1,
                                    redirectStep: null,
                                });
                                // handleNext();
                            }}
                            className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all hover:shadow-md ${params.unitId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                    Lot {item.lot}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">
                                    Blk {item.block}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Home className="text-primary size-4" />
                                {item.modelName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mb-2">
                                {/* {item.modelNo} */}
                            </p>

                            {/* Stats Section */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                    <Briefcase className="size-4" />
                                    <span>{item.jobCount} Jobs</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-foreground ml-auto">
                                    <DollarSign className="size-4 text-primary" />
                                    <span>
                                        $
                                        {item.totalJobCost.toLocaleString(
                                            "en-US",
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                    {hasNoMatches && (
                        <div className="col-span-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                            No matching units found.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {[...Array(10)].map((item, itemId) => (
                <div
                    key={itemId}
                    className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all hover:shadow-md border-border bg-card hover:bg-muted/50`}
                >
                    <div className="flex items-center justify-between w-full mb-1">
                        <Skeleton className="w-16 h-4" />
                        <Skeleton className="w-12 h-4" />
                    </div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Skeleton className="text-primary size-4" />
                        <Skeleton className="w-1/2 h-5" />
                    </div>
                    <Skeleton className="w-1/2 h-3 mb-2" />

                    {/* Stats Section */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Skeleton className="size-4" />
                            <Skeleton className="w-12 h-3" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-foreground ml-auto">
                            <Skeleton className="size-4 text-primary" />

                            <Skeleton className="w-16 h-3" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
