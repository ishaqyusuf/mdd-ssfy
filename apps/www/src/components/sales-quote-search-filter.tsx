"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";

export function SalesQuoteSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: salesFilterParamsSchema,
                },
            ]}
        >
            <Content />
        </SearchFilterProvider>
    );
}
function Content({}) {
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        ...trpc.filters.salesOrders.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Quotes"}
                filterList={trpcFilterData}
                SearchTips={
                    <div className="space-y-2 text-sm">
                        <div>
                            <strong>items:</strong>{" "}
                            <span className="text-muted-foreground">
                                item name
                            </span>
                            <div className="text-xs text-muted-foreground">
                                to search based on sales/quote items
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium mb-1">
                                Examples
                            </div>
                            <div className="flex flex-col gap-1">
                                <span>
                                    <strong>items:</strong> hc molded
                                </span>
                                <span>
                                    <strong>items:</strong> h.c smooth
                                </span>
                                <span>
                                    <strong>items:</strong> h.c 2pnl sqr
                                </span>
                                <span>
                                    <strong>items:</strong> 1-6 x 6-8
                                </span>
                            </div>
                        </div>
                    </div>
                }
            />
        </>
    );
}

