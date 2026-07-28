import { Card } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

function ImportStatCardSkeleton() {
    return (
        <Card className="p-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="mt-3 h-8 w-20 rounded-md" />
            <Skeleton className="mt-2 h-4 w-40 rounded-md" />
        </Card>
    );
}

function ImportCheckRowSkeleton() {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full" />
        </div>
    );
}

function ImportTableRowSkeleton() {
    return (
        <div className="grid grid-cols-[1.6fr,1fr,96px] items-center gap-4 border-b py-4 last:border-b-0">
            <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="justify-self-end">
                <Skeleton className="h-5 w-14 rounded-md" />
            </div>
        </div>
    );
}

export function InventoryImportControlCenterSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64 rounded-md" />
                <Skeleton className="h-4 w-full max-w-3xl rounded-md" />
                <Skeleton className="h-4 w-2/3 max-w-2xl rounded-md" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <ImportStatCardSkeleton key={`stat-${index}`} />
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
                <Card className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-36 rounded-md" />
                            <Skeleton className="h-4 w-full max-w-md rounded-md" />
                            <Skeleton className="h-4 w-72 rounded-md" />
                        </div>
                        <Skeleton className="h-7 w-32 rounded-full" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={`scope-${index}`}
                                className="h-9 w-28 rounded-md"
                            />
                        ))}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={`action-${index}`}
                                className="h-10 w-full rounded-md"
                            />
                        ))}
                    </div>

                    <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="mt-3 h-4 w-full rounded-md" />
                        <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="h-4 w-full rounded-md" />
                    </div>
                    <div className="mt-4 grid gap-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <ImportCheckRowSkeleton key={`check-${index}`} />
                        ))}
                    </div>
                </Card>
            </div>

            <Card className="p-5">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                </div>
                <div className="mt-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <ImportTableRowSkeleton key={`row-${index}`} />
                    ))}
                </div>
            </Card>
        </div>
    );
}
