import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";

import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Layers, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "@gnd/ui/hooks/use-search";
import { SearchInput } from "@/components/search-input";
export function FormStep({}) {
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
            <div className="relative">
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search tasks..."
                />
            </div>
            <div className="space-y-2 ">
                {results.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            // setParams({
                            //     taskId: item.id,
                            //     step: params.redirectStep || params.step + 1,
                            //     redirectStep: null,
                            // });
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
        </div>
    );
}

