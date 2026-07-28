import { Skeleton } from "@gnd/ui/skeleton";

const SKELETON_ROWS = ["one", "two", "three", "four", "five"] as const;

export function RecentSalesListSkeleton() {
	return (
		<section
			aria-label="Loading recent sales"
			className="overflow-hidden rounded-lg border border-border bg-background"
		>
			<div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
				<div className="space-y-1.5">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-28" />
				</div>
				<Skeleton className="h-8 w-20" />
			</div>
			<div aria-hidden="true" className="divide-y divide-border">
				{SKELETON_ROWS.map((row) => (
					<div
						className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5"
						key={row}
					>
						<div className="min-w-0 space-y-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-36 max-w-full" />
						</div>
						<div className="space-y-1.5">
							<Skeleton className="ml-auto h-4 w-20" />
							<Skeleton className="ml-auto h-3 w-14" />
						</div>
						<Skeleton className="col-span-2 h-6 w-28 sm:col-span-1" />
					</div>
				))}
			</div>
		</section>
	);
}
