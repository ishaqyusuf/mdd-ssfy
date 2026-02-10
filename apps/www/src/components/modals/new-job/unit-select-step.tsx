import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, DollarSign, Home } from "lucide-react";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { SearchInput } from "@/components/search-input";
export function UnitSelectStep({}) {
    const { setParams, ...params } = useJobFormParams();
    const { data, isPending, refetch, isEnabled } = useQuery(
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
    const { query, results, setQuery, clear } = useSearch({
        items: units,
    });

    return (
        <div className="space-y-4">
            <div className="relative">
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search units..."
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {results.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setParams({
                                unitId: item.id,
                                step: params.redirectStep || params.step + 1,
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
                            {item.modelNo}
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
                                    {item.totalJobCost.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

