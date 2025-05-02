import { getMyRecentSales } from "@/actions/cached-sales-queries";
import { authId } from "@/app/(v1)/_actions/utils";

import { Skeleton } from "@gnd/ui/skeleton";

import { Sales } from "./sales";
import { SalesRowSkeleton } from "./sales-row";

export function RecentSalesSkeleton() {
    return (
        <div className="mt-8">
            <div className="flex items-center justify-between border border-border p-3 py-2">
                <div className="w-1/2">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            </div>
            <div className="mt-4 space-y-2">
                {Array.from({ length: 10 }).map((_, index) => (
                    <SalesRowSkeleton key={index.toString()} />
                ))}
            </div>
        </div>
    );
}
export async function RecentSalesWidget() {
    const [{ data: salesList }] = await Promise.all([
        getMyRecentSales({
            "salesRep.id": await authId(),
            size: 5,
        }),
    ]);
    return (
        <div>
            <Sales sales={salesList} />
        </div>
    );
}
