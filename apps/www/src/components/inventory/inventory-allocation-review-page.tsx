"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery, useMutation } from "@gnd/ui/tanstack";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { toast } from "@gnd/ui/use-toast";

export function InventoryAllocationReviewPage() {
  const trpc = useTRPC();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const allocations = useInfiniteQuery(
    trpc.inventories.pendingAllocations.infiniteQueryOptions(
      {
        size: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.meta?.cursor,
      },
    ),
  );

  const approveAll = useMutation(
    trpc.inventories.approveBulkStockAllocation.mutationOptions({
      onSuccess(data) {
        toast({
          title: "Allocations approved",
          description: `${data.count} allocation suggestions approved.`,
          variant: "success",
        });
        allocations.refetch();
      },
    }),
  );

  const approveOne = useMutation(
    trpc.inventories.approveStockAllocation.mutationOptions({
      onSuccess() {
        toast({
          title: "Allocation approved",
          variant: "success",
        });
        allocations.refetch();
      },
    }),
  );

  const rejectOne = useMutation(
    trpc.inventories.rejectStockAllocation.mutationOptions({
      onSuccess() {
        toast({
          title: "Allocation rejected",
          variant: "success",
        });
        allocations.refetch();
      },
    }),
  );

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!allocations.hasNextPage || allocations.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          allocations.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [
    allocations.fetchNextPage,
    allocations.hasNextPage,
    allocations.isFetchingNextPage,
  ]);

  const pages = allocations.data?.pages || [];
  const rows = useMemo(
    () => pages.flatMap((page) => page.data || []),
    [pages],
  );
  const pendingIds = rows.map((row) => row.id);
  const total = pages[0]?.meta?.count || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Allocation Review</h2>
          <p className="text-sm text-muted-foreground">
            Review suggested stock reservations before they become committed allocations.
          </p>
        </div>
        <Button
          type="button"
          onClick={() =>
            approveAll.mutate({
              allocationIds: pendingIds,
            })
          }
          disabled={!pendingIds.length || approveAll.isPending}
        >
          Approve Visible
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Pending</div>
          <div className="text-2xl font-semibold">{total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Visible Suggestions
          </div>
          <div className="text-2xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Safety Gate
          </div>
          <div className="text-sm font-medium">Manual approval required</div>
        </Card>
      </div>

      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="font-medium">
                  {row.inventoryVariant?.inventory?.name || "Unknown inventory"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Order {row.lineItemComponent?.parent?.sale?.orderId || "N/A"} •{" "}
                  Component {row.lineItemComponent?.parent?.title || "Untitled"} • Qty{" "}
                  {Number(row.qty || 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Available stock {row.inventoryStockQty} • Shortage{" "}
                  {Number(row.shortageQty || 0)}
                  {row.supplierName ? ` • Supplier ${row.supplierName}` : ""}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {String(row.status || "pending_review").replaceAll("_", " ")}
                </Badge>
                <Button
                  size="sm"
                  onClick={() =>
                    approveOne.mutate({
                      allocationId: row.id,
                    })
                  }
                  disabled={approveOne.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    rejectOne.mutate({
                      allocationId: row.id,
                    })
                  }
                  disabled={rejectOne.isPending}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {allocations.hasNextPage ? (
          <div ref={loadMoreRef} className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => allocations.fetchNextPage()}
              disabled={allocations.isFetchingNextPage}
            >
              {allocations.isFetchingNextPage ? "Loading more..." : "Load More"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
