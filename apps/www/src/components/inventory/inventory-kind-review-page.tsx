"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@gnd/ui/tanstack";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Card } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { Icons } from "@gnd/ui/icons";

export function InventoryKindReviewPage() {
    const trpc = useTRPC();
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const review = useInfiniteQuery(
        trpc.inventories.inventoryProductKindReview.infiniteQueryOptions(
            {
                size: 24,
            },
            {
                getNextPageParam: (lastPage) => lastPage.meta?.cursor,
            },
        ),
    );
    const backfill = useMutation(
        trpc.inventories.backfillInventoryProductKinds.mutationOptions({
            onSuccess(data) {
                toast({
                    title: "Product types updated",
                    description: `${data.inventoryCount} inventory items, ${data.componentCount} components, ${data.unchangedCount} unchanged.`,
                    variant: "success",
                });
                review.refetch();
            },
        }),
    );

    useEffect(() => {
        if (!loadMoreRef.current) return;
        if (!review.hasNextPage || review.isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    review.fetchNextPage();
                }
            },
            {
                rootMargin: "200px",
            },
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [review.hasNextPage, review.isFetchingNextPage, review.fetchNextPage]);

    const pages = review.data?.pages || [];
    const summary = pages[0]?.summary;
    const rows = useMemo(
        () => pages.flatMap((page) => page.data || []),
        [pages],
    );
    const mismatched = summary?.mismatched || 0;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Kind Review</h2>
                    <p className="text-sm text-muted-foreground">
                        Review current product type against the pricing-based
                        migration suggestion before or after running the
                        backfill.
                    </p>
                </div>
                <Button
                    type="button"
                    onClick={() => backfill.mutate()}
                    disabled={backfill.isPending}
                >
                    <Icons.Refresh className="size-4 mr-2" />
                    Run Backfill
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">
                        Total
                    </div>
                    <div className="text-2xl font-semibold">
                        {summary?.total || 0}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">
                        Needs Review
                    </div>
                    <div className="text-2xl font-semibold">{mismatched}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">
                        Heuristic
                    </div>
                    <div className="text-sm font-medium">
                        Priced item =&gt; inventory
                    </div>
                </Card>
            </div>

            <div className="grid gap-3">
                {rows.map((row) => (
                    <Card key={row.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="font-medium">{row.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    {row.category || "No category"} •{" "}
                                    {row.variantCount} variants •{" "}
                                    {row.pricingCount} pricing rows
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    current: {row.currentKind}
                                </Badge>
                                <Badge
                                    variant={
                                        row.needsReview
                                            ? "destructive"
                                            : "secondary"
                                    }
                                    className="capitalize"
                                >
                                    suggested: {row.suggestedKind}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                ))}
                {review.hasNextPage ? (
                    <div ref={loadMoreRef} className="flex justify-center pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={review.isFetchingNextPage}
                            onClick={() => review.fetchNextPage()}
                        >
                            {review.isFetchingNextPage
                                ? "Loading more..."
                                : "Load More"}
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

