import { Skeleton } from "@gnd/ui/skeleton";

export function PrintLoading() {
    return (
        <div className="flex flex-col items-center justify-center h-[300px] gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-transparent"></div>

            <p className="text-muted-foreground text-sm tracking-wide">
                Preparing your print preview…
            </p>

            <div className="w-48 space-y-3 mt-2">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-[80%] rounded" />
                <Skeleton className="h-3 w-[60%] rounded" />
            </div>
        </div>
    );
}

