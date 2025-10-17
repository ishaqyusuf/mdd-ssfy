import { Spinner } from "../../spinner";
import { useTable } from ".";
import { ForwardedRef } from "react";

export function LoadMore({}) {
  const ctx = useTable();
  if (!ctx?.hasMore) return null;
  return (
    <div className="flex items-center justify-center mt-6" ref={ctx.moreRef}>
      <div className="flex items-center space-x-2 px-6 py-5">
        <Spinner />
        <span className="text-sm text-[#606060]">Loading more...</span>
      </div>
    </div>
  );
}
export function LoadMoreTRPC({}: {}) {
  const { props } = useTable();

  if (!props?.hasNextPage || !props?.loadMoreRef) return null;

  return (
    <div
      className="flex items-center justify-center mt-6"
      ref={props?.loadMoreRef}
    >
      <div className="flex items-center space-x-2 px-6 py-5">
        <Spinner />
        <span className="text-sm text-[#606060]">Loading more...</span>
      </div>
    </div>
  );
}
