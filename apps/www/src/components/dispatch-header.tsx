"use client";

import { DispatchSearchFilter } from "./dispatch-search-filter";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

export function DispatchHeader({}) {
    const { filters, setFilters } = useDispatchFilterParams();
    const tabValue = filters.status === "completed" ? "completed" : "pending";

    return (
        <div className="flex flex-col gap-3">
            <Tabs
                value={tabValue}
                onValueChange={(value) => {
                    setFilters({
                        status: value === "completed" ? "completed" : null,
                    });
                }}
            >
                <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
            </Tabs>
            <DispatchSearchFilter />
        </div>
    );
}
