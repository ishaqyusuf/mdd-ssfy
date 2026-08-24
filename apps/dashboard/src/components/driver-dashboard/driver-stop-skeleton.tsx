import { Skeleton } from "@gnd/ui/skeleton";

function MetricSkeleton() {
	return (
		<div className="min-w-[9.5rem] flex-1 border-r border-border/80 px-4 py-4 last:border-r-0">
			<Skeleton className="h-3 w-24" />
			<Skeleton className="mt-3 h-7 w-20" />
			<Skeleton className="mt-2 h-3 w-28" />
		</div>
	);
}

function PackingListSkeleton() {
	return (
		<section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-80 max-w-[65vw]" />
				</div>
				<Skeleton className="hidden h-9 w-24 rounded-md sm:block" />
			</header>
			<div className="divide-y px-4 sm:px-5">
				{[1, 2, 3, 4].map((row) => (
					<div
						key={row}
						className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-center sm:gap-4"
					>
						<div className="min-w-0 space-y-2">
							<Skeleton className="h-4 w-52 max-w-full" />
							<Skeleton className="h-3 w-72 max-w-[80%]" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-14" />
							<Skeleton className="h-1.5 w-full" />
						</div>
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-11 w-full rounded-md sm:h-9 sm:w-16" />
					</div>
				))}
			</div>
		</section>
	);
}

function DetailCardSkeleton({ rows = 0 }: { rows?: number }) {
	return (
		<section className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="space-y-2 border-b px-4 py-4">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-3 w-48 max-w-full" />
			</header>
			<div className="divide-y px-4">
				{["first", "second", "third", "fourth"].slice(0, rows).map((row) => (
					<div
						key={row}
						className="flex items-center justify-between gap-3 py-3"
					>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
				{rows === 0 ? (
					<div className="space-y-3 py-4">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-full" />
						<div className="grid grid-cols-2 gap-2 pt-1">
							<Skeleton className="h-9 rounded-md" />
							<Skeleton className="h-9 rounded-md" />
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}

export function DriverStopSkeleton({
	showWorkspaceHeader = false,
}: {
	showWorkspaceHeader?: boolean;
}) {
	return (
		<div
			aria-busy="true"
			aria-label="Loading dispatch stop"
			className="flex h-full min-h-[32rem] flex-col bg-background"
		>
			{showWorkspaceHeader ? (
				<header className="flex h-[73px] shrink-0 items-center gap-3 border-b bg-background/95 px-4 py-3 sm:px-6">
					<Skeleton className="hidden size-9 rounded-lg sm:block" />
					<Skeleton className="size-9 rounded-md" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-48 max-w-[60vw]" />
						<Skeleton className="h-3 w-72 max-w-[75vw]" />
					</div>
					<Skeleton className="hidden h-7 w-32 rounded-full md:block" />
					<Skeleton className="hidden h-9 w-20 rounded-md sm:block" />
					<Skeleton className="hidden h-7 w-20 rounded-full lg:block" />
					<Skeleton className="size-9 rounded-md" />
				</header>
			) : null}

			<div className="relative min-h-0 flex-1 overflow-hidden bg-emerald-950/[0.025]">
				<div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pb-8 lg:px-8">
					<section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 space-y-2">
							<Skeleton className="h-3 w-44" />
							<Skeleton className="h-8 w-72 max-w-[75vw]" />
							<Skeleton className="h-4 w-64 max-w-[70vw]" />
						</div>
						<div className="hidden gap-2 sm:flex">
							<Skeleton className="h-9 w-28 rounded-md" />
							<Skeleton className="h-9 w-24 rounded-md" />
						</div>
					</section>

					<section className="mt-5 flex overflow-hidden rounded-xl border bg-card shadow-sm">
						{[1, 2, 3, 4, 5].map((metric) => (
							<MetricSkeleton key={metric} />
						))}
					</section>

					<div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
						<PackingListSkeleton />
						<aside className="grid content-start gap-4">
							<DetailCardSkeleton />
							<DetailCardSkeleton rows={4} />
							<DetailCardSkeleton rows={2} />
						</aside>
					</div>
				</div>

				<div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[auto_1fr] gap-2 border-t bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:hidden">
					<Skeleton className="size-10 rounded-md" />
					<Skeleton className="h-10 rounded-md" />
				</div>
			</div>
		</div>
	);
}
