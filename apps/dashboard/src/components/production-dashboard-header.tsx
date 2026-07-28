"use client";

import { useAuth } from "@/hooks/use-auth";
import { SalesProductionSearchFilter } from "./sales-production-search-filter";

export function ProductioDashboardHeader() {
    const auth = useAuth();
    return (
        <div>
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-2xl font-bold tracking-tight">
                    Welcome back, {auth.name}
                </h2>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    {/* <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search orders..."
                            className="w-full pl-8 sm:w-[250px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button> */}
                </div>
            </div>
        </div>
    );
}

