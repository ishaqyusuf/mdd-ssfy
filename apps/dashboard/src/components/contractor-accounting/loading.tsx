import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

export function ContractorAccountingLoading() {
	return (
		<div className="flex flex-col gap-6 pb-8 pt-2">
			<Skeleton className="h-48 w-full rounded-3xl" />
			<Card className="rounded-3xl">
				<CardHeader>
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-4 w-3/4" />
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-40" />
				</CardContent>
			</Card>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{["opening", "earned", "paid", "closing"].map((metric) => (
					<Skeleton key={metric} className="h-28 rounded-2xl" />
				))}
			</div>
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
				<Skeleton className="h-96 rounded-3xl" />
				<Skeleton className="h-96 rounded-3xl" />
			</div>
		</div>
	);
}
