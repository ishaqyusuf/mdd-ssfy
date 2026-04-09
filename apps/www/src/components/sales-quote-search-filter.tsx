"use client";

import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { _trpc } from "./static-trpc";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index";
import { useQueryStates } from "nuqs";

export function SalesQuoteSearchFilter() {
    const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
    return (
        <SearchFilter
            filterSchema={salesFilterParamsSchema}
            placeholder="Search Order Information..."
            trpcRoute={_trpc.filters.salesOrders}
            // trpQueryOptions={{
            //     salesManager: auth?.can?.viewSalesManager,
            // }}
            {...{ filters, setFilters }}
        />
    );
    // return (
    //     <SearchFilterProvider
    //         args={[
    //             {
    //                 filterSchema: salesFilterParamsSchema,
    //             },
    //         ]}
    //     >
    //         <Content />
    //     </SearchFilterProvider>
    // );
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

