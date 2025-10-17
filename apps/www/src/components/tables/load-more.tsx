import { Spinner } from "@gnd/ui/spinner";
import { useTable } from ".";
import { ForwardedRef } from "react";

export function LoadMore({
    hasNextPage,
    ref,
}: {
    hasNextPage?: boolean;
    ref?: ForwardedRef<HTMLDivElement>;
}) {
    const ctx = useTable();
    if ((!ref && !ctx?.hasMore) || (ref && !hasNextPage)) return null;
    if (!ref) ref = ctx?.moreRef;
    return (
        <div className="flex items-center justify-center mt-6" ref={ref}>
            <div className="flex items-center space-x-2 px-6 py-5">
                <Spinner />
                <span className="text-sm text-[#606060]">Loading more...</span>
            </div>
        </div>
    );
}
export function LoadMoreTRPC({
    hasNextPage,
    ref,
}: {
    hasNextPage?: boolean;
    ref?: ForwardedRef<HTMLDivElement>;
}) {
    // if (!hasNextPage) return null;

    return (
        <div className="flex items-center justify-center mt-6" ref={ref}>
            <div className="flex items-center space-x-2 px-6 py-5">
                <Spinner />
                <span className="text-sm text-[#606060]">Loading more...</span>
            </div>
        </div>
    );
}
