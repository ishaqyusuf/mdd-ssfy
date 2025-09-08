import { Skeleton } from "@gnd/ui/skeleton";

export function GridSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(15)].map((a, i) => (
                <Skeleton className="h-56" key={i} />
            ))}
        </div>
    );
}

