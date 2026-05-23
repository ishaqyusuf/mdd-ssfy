import { Skeleton } from "@gnd/ui/skeleton";

export function ComponentCardSkeletonGrid({ count = 6 }: { count?: number }) {
	const skeletonKeys = Array.from(
		{ length: count },
		(_, index) => `component-skeleton-${count}-${index}`,
	);

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
			{skeletonKeys.map((key) => (
				<div key={key} className="overflow-hidden rounded-lg border bg-card">
					<Skeleton className="h-32 w-full" />
					<div className="space-y-2 p-3">
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-3 w-1/3" />
					</div>
				</div>
			))}
		</div>
	);
}
