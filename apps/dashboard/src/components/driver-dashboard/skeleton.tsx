import { Skeleton } from "@gnd/ui/skeleton";

function SummarySkeleton() {
	return (
		<section
			aria-label="Loading route summary"
			className="flex snap-x overflow-hidden rounded-xl border bg-card shadow-sm xl:grid xl:grid-cols-5"
		>
			{["assigned", "ready", "active", "attention", "completed"].map((id) => (
				<div
					key={id}
					className="min-w-[145px] flex-1 border-r border-border/70 px-4 py-4 last:border-r-0"
				>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="size-4 rounded-full" />
					</div>
					<Skeleton className="mt-4 h-7 w-10" />
					<Skeleton className="mt-2 h-3 w-24" />
				</div>
			))}
		</section>
	);
}

function FeaturedStopSkeleton() {
	return (
		<article className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-3 w-52 max-w-[60vw]" />
				</div>
				<Skeleton className="h-6 w-24 rounded-full" />
			</header>
			<div className="space-y-4 p-4 sm:p-5">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-3 w-44 max-w-full" />
						<Skeleton className="h-7 w-64 max-w-[75%]" />
						<Skeleton className="h-4 w-20" />
					</div>
					<div className="space-y-2">
						<Skeleton className="ml-auto h-4 w-24" />
						<Skeleton className="ml-auto h-3 w-16" />
					</div>
				</div>

				<div className="flex items-center justify-between gap-4 border-y py-4">
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-full max-w-md" />
						<Skeleton className="h-3 w-72 max-w-[80%]" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="size-9 rounded-md" />
						<Skeleton className="size-9 rounded-md" />
					</div>
				</div>

				<div className="grid gap-2 sm:grid-cols-3">
					{["packing", "inventory", "destination"].map((id) => (
						<div key={id} className="rounded-lg bg-muted/40 p-3">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="mt-2 h-4 w-28 max-w-full" />
						</div>
					))}
				</div>

				<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
					<Skeleton className="h-12 w-full rounded-md" />
					<Skeleton className="h-12 w-full rounded-md sm:w-28" />
				</div>
			</div>
		</article>
	);
}

function RouteListSkeleton() {
	return (
		<section className="space-y-3">
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-64 max-w-[80%]" />
			</div>
			<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
				<div className="border-b bg-muted/35 px-4 py-2">
					<Skeleton className="h-3 w-28" />
				</div>
				{[1, 2, 3].map((row) => (
					<div
						key={row}
						className="grid min-h-20 grid-cols-[40px_minmax(0,1fr)_auto_20px] items-center gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[48px_minmax(0,1fr)_150px_120px_20px]"
					>
						<Skeleton className="size-9 rounded-full" />
						<div className="min-w-0 space-y-2">
							<Skeleton className="h-4 w-48 max-w-full" />
							<Skeleton className="h-3 w-32 max-w-[80%]" />
						</div>
						<div className="hidden space-y-2 sm:block">
							<Skeleton className="h-1.5 w-full" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-6 w-24 rounded-full" />
						<Skeleton className="size-4" />
					</div>
				))}
			</div>
		</section>
	);
}

function SideCardSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<article className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="space-y-2 border-b px-4 py-4">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-3 w-52 max-w-full" />
			</header>
			<div className="divide-y px-4">
				{["first", "second", "third"].slice(0, rows).map((row) => (
					<div key={row} className="flex gap-3 py-3">
						<Skeleton className="size-8 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-4 w-full max-w-48" />
							<Skeleton className="h-3 w-28" />
						</div>
					</div>
				))}
			</div>
		</article>
	);
}

export function DriverDashboardSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading dispatch tasks"
			className="min-w-0 space-y-4 pb-20 sm:space-y-5 sm:pb-8"
		>
			<header className="flex flex-col gap-4 border-b pb-4 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0 space-y-2">
					<Skeleton className="h-3 w-40" />
					<Skeleton className="h-8 w-56 max-w-[70vw]" />
					<Skeleton className="h-4 w-[32rem] max-w-[85vw]" />
				</div>
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-9 w-36 rounded-full" />
					<Skeleton className="h-9 w-24 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
				</div>
			</header>

			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="grid h-9 grid-cols-4 gap-1 rounded-md bg-muted/50 p-1 lg:w-[390px]">
					{[1, 2, 3, 4].map((tab) => (
						<Skeleton key={tab} className="h-7 rounded-sm" />
					))}
				</div>
				<Skeleton className="h-9 w-full rounded-md lg:w-80" />
			</div>

			<SummarySkeleton />

			<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.72fr)]">
				<div className="min-w-0 space-y-4">
					<FeaturedStopSkeleton />
					<RouteListSkeleton />
				</div>
				<aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
					<SideCardSkeleton rows={2} />
					<SideCardSkeleton />
				</aside>
			</div>
		</div>
	);
}
