import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@gnd/ui/skeleton";
import { useInfiniteQuery, useSuspenseQuery } from "@gnd/ui/tanstack";
import { Suspense } from "react";
import { EmptyState } from "./empty-state";
import { useDebugToast } from "@/hooks/use-debug-console";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { formatDate } from "@gnd/utils/dayjs";
import { Label } from "@gnd/ui/label";

export function SalesHistory({ salesId }) {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <Content salesId={salesId} />
        </Suspense>
    );
}
function Content({ salesId }) {
    const trpc = useTRPC();
    const {
        data: hx,
        isPending,
        error,
    } = useSuspenseQuery(
        trpc.sales.getSalesHx.queryOptions(
            {
                salesNo: salesId,
            },
            {
                enabled: !!salesId,
            },
        ),
    );
    useDebugToast("Hx", hx, { salesId });
    if (!hx?.length || !salesId)
        return (
            <EmptyState
                className="h-[60vh]"
                title="This sales has no history"
                empty
                description="Sales history will be available when you update your sales invoice."
            ></EmptyState>
        );

    return (
        <div className="">
            {hx.map((line) => (
                <div className="" key={line.id}>
                    <Card>
                        <CardContent>
                            <Label className="uppercase">
                                {formatDate(
                                    line.createdAt,
                                    "MMM, DD, YYYY, HH:mma",
                                )}
                            </Label>
                            <div className="text-sm">
                                <span className="size-3 rounded-full bg-gray-500"></span>
                                <span>{line?.senderContact?.name}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    );
}
function LoadingSkeleton() {
    return (
        <>
            {[...Array(5)].map((a, i) => (
                <div key={i} className="flex justify-between">
                    <div className="grid gap-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="size-4" />
                </div>
            ))}
        </>
    );
}

