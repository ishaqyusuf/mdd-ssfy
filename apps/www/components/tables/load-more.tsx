import { Spinner } from "@gnd/ui/spinner";
import { useTable } from ".";

export function LoadMore({}) {
    const ctx = useTable();
    if (!ctx?.hasMore) return null;
    return (
        <div
            className="flex items-center justify-center mt-6"
            ref={ctx.moreRef}
        >
            <div className="flex items-center space-x-2 px-6 py-5">
                <Spinner />
                <span className="text-sm text-[#606060]">Loading more...</span>
            </div>
        </div>
    );
}
