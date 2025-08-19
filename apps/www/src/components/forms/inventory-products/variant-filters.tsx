import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useProductVariants } from "./context";
import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";

export function VariantFilters({}) {
    const ctx = useProductVariants();
    console.log(ctx?.filter);
    if (!ctx.filter?.params) return null;

    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: ctx.filter?.paramsSchema,
                },
            ]}
        >
            <SearchFilterTRPC
                placeholder={"Filter variant properties"}
                filterList={ctx?.filter?.filterList as any}
            />
        </SearchFilterProvider>
    );
}

