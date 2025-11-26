import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Skeleton } from "../skeleton";

export function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Skeleton className="h-4 w-32" />
        </CardTitle>
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <Skeleton className="h-8 w-24" />
        </div>
        <p className="text-xs text-muted-foreground">
          <Skeleton className="h-3 w-48" />
        </p>
      </CardContent>
    </Card>
  );
}