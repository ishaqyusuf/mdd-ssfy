import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";

type ProductionV2BoardSkeletonProps = {
	className?: string;
	rows?: number;
};

const summaryTones = [
	{ id: "open", className: "bg-emerald-50/80 ring-emerald-100" },
	{ id: "past-due", className: "bg-rose-50/80 ring-rose-100" },
	{ id: "today", className: "bg-amber-50/80 ring-amber-100" },
	{ id: "tomorrow", className: "bg-sky-50/80 ring-sky-100" },
	{ id: "completed", className: "bg-slate-50 ring-slate-100" },
];

function skeletonItems(prefix: string, count: number) {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

export function ProductionV2BoardSkeleton({
	className,
	rows = 4,
}: ProductionV2BoardSkeletonProps) {
	return (
		<div
			className={cn("grid gap-6", className)}
			aria-busy="true"
			aria-label="Loading production board"
		>
			<span className="sr-only">Loading production board</span>
			<section
				aria-hidden="true"
				className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eef7ff_100%)] shadow-[0_20px_55px_-34px_rgba(15,23,42,0.32)]"
			>
				<div className="grid gap-6 px-5 py-6 lg:px-7 lg:py-7 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-3">
							<Skeleton className="h-7 w-36 rounded-full bg-white/80" />
							<Skeleton className="h-7 w-28 rounded-full bg-emerald-100/80" />
						</div>
						<div className="space-y-3">
							<Skeleton className="h-9 w-[min(76%,34rem)] rounded-md bg-slate-200/80" />
							<Skeleton className="h-4 w-[min(88%,42rem)] rounded-full bg-slate-200/70" />
							<Skeleton className="h-4 w-[min(62%,30rem)] rounded-full bg-slate-200/60" />
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
						<Skeleton className="h-11 rounded-2xl bg-white/90 shadow-sm" />
						<Skeleton className="h-11 rounded-2xl bg-white/90 shadow-sm" />
						<Skeleton className="h-11 rounded-2xl bg-white/90 shadow-sm sm:col-span-2 xl:col-span-1" />
					</div>
				</div>
			</section>

			<section
				aria-hidden="true"
				className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
			>
				{summaryTones.map((tone) => (
					<ProductionV2SummarySkeleton
						key={tone.id}
						className={tone.className}
					/>
				))}
			</section>

			<section
				aria-hidden="true"
				className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start"
			>
				<div className="w-full rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_-26px_rgba(15,23,42,0.18)]">
					<div className="flex flex-col gap-3 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-2">
							<Skeleton className="h-6 w-44 rounded-md bg-slate-200/80" />
							<Skeleton className="h-4 w-72 max-w-full rounded-full bg-slate-200/60" />
						</div>
						<div className="flex items-center gap-2">
							<Skeleton className="h-9 w-28 rounded-xl bg-slate-100" />
							<Skeleton className="h-9 w-24 rounded-xl bg-slate-100" />
						</div>
					</div>
					<div className="space-y-3 px-5 pb-5">
						<ProductionV2OrderFeedSkeleton rows={rows} />
					</div>
				</div>

				<div className="grid gap-4 xl:sticky xl:top-4">
					<ProductionV2CalendarSkeleton />
					<ProductionV2SnapshotSkeleton />
				</div>
			</section>
		</div>
	);
}

export function ProductionV2OrderFeedSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="grid gap-3">
			{skeletonItems("production-order-skeleton", rows).map((key, index) => (
				<ProductionV2OrderCardSkeleton key={key} index={index} />
			))}
		</div>
	);
}

export function ProductionV2OrderCardSkeleton({
	index = 0,
}: {
	index?: number;
}) {
	const titleWidth = index % 2 === 0 ? "w-36" : "w-44";
	const customerWidth = index % 3 === 0 ? "w-56" : "w-44";

	return (
		<div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_18px_38px_-30px_rgba(15,23,42,0.22)]">
			<div className="flex items-start gap-3 px-4 py-4 sm:px-5">
				<Skeleton className="mt-1 h-4 w-4 shrink-0 rounded-[4px] bg-slate-200" />
				<div className="min-w-0 flex-1 space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0 flex-1 space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								<Skeleton
									className={cn("h-6 rounded-md bg-slate-200", titleWidth)}
								/>
								<Skeleton className="h-6 w-20 rounded-full bg-amber-100" />
								<Skeleton className="h-6 w-24 rounded-full bg-sky-100" />
							</div>
							<Skeleton
								className={cn(
									"h-4 rounded-full bg-slate-200/80",
									customerWidth,
								)}
							/>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Skeleton className="h-9 w-20 rounded-xl bg-slate-100" />
							<Skeleton className="h-9 w-24 rounded-xl bg-slate-100" />
						</div>
					</div>
					<div className="grid min-w-0 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
						<MetaBlockSkeleton className="w-24" />
						<MetaBlockSkeleton className="w-32" />
						<MetaBlockSkeleton className="w-20" tone="bg-rose-100" />
					</div>
				</div>
			</div>
		</div>
	);
}

function ProductionV2SummarySkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"rounded-[22px] border border-slate-200/80 p-4 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.28)] ring-1",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<Skeleton className="h-4 w-24 rounded-full bg-slate-200/80" />
				<Skeleton className="h-9 w-9 rounded-xl bg-white/90" />
			</div>
			<Skeleton className="mt-4 h-8 w-16 rounded-md bg-slate-200/80" />
			<Skeleton className="mt-3 h-2 w-full rounded-full bg-white/90" />
		</div>
	);
}

function ProductionV2CalendarSkeleton() {
	return (
		<div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.2)]">
			<div className="space-y-4 px-5 pb-4 pt-5">
				<div className="space-y-2">
					<Skeleton className="h-5 w-36 rounded-md bg-slate-200/80" />
					<Skeleton className="h-4 w-56 max-w-full rounded-full bg-slate-200/60" />
				</div>
				<div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
					<Skeleton className="h-3 w-28 rounded-full bg-slate-200/70" />
					<Skeleton className="h-5 w-36 rounded-md bg-slate-200/80" />
					<Skeleton className="h-3 w-24 rounded-full bg-slate-200/60" />
				</div>
				<div className="grid grid-cols-2 gap-2">
					<LegendSkeleton tone="bg-rose-400" />
					<LegendSkeleton tone="bg-amber-400" />
					<LegendSkeleton tone="bg-sky-400" />
					<LegendSkeleton tone="bg-emerald-400" />
				</div>
			</div>
			<div className="px-4 pb-4 pt-0">
				<div className="rounded-[22px] border border-slate-200 bg-white p-3">
					<div className="mb-3 flex items-center justify-between">
						<Skeleton className="h-7 w-7 rounded-full bg-slate-100" />
						<Skeleton className="h-4 w-28 rounded-full bg-slate-200" />
						<Skeleton className="h-7 w-7 rounded-full bg-slate-100" />
					</div>
					<div className="grid grid-cols-7 gap-1.5">
						{skeletonItems("calendar-day-skeleton", 35).map((key, index) => (
							<div
								key={key}
								className="min-h-[40px] rounded-xl border border-slate-100 bg-slate-50 p-1.5"
							>
								<Skeleton className="h-2.5 w-3 rounded-full bg-slate-200/70" />
								{index % 5 === 0 ? (
									<Skeleton className="mt-5 h-1.5 w-4 rounded-full bg-sky-200" />
								) : null}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function ProductionV2SnapshotSkeleton() {
	return (
		<div className="rounded-[24px] border border-slate-900 bg-slate-950 p-5 text-slate-50 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
			<div className="flex items-center justify-between gap-3">
				<Skeleton className="h-5 w-32 rounded-md bg-white/20" />
				<Skeleton className="h-8 w-8 rounded-xl bg-emerald-300/20" />
			</div>
			<div className="mt-4 grid grid-cols-2 gap-3">
				<div className="rounded-2xl bg-white/10 p-3">
					<Skeleton className="h-3 w-14 rounded-full bg-white/20" />
					<Skeleton className="mt-3 h-7 w-12 rounded-md bg-white/25" />
				</div>
				<div className="rounded-2xl bg-white/10 p-3">
					<Skeleton className="h-3 w-16 rounded-full bg-white/20" />
					<Skeleton className="mt-3 h-7 w-10 rounded-md bg-white/25" />
				</div>
			</div>
			<Skeleton className="mt-4 h-3 w-full rounded-full bg-white/20" />
			<Skeleton className="mt-2 h-3 w-4/5 rounded-full bg-white/15" />
		</div>
	);
}

function MetaBlockSkeleton({
	className,
	tone = "bg-slate-200/80",
}: {
	className?: string;
	tone?: string;
}) {
	return (
		<div className="min-w-0 space-y-2">
			<Skeleton className="h-3 w-16 rounded-full bg-slate-200/60" />
			<Skeleton className={cn("h-4 rounded-full", tone, className)} />
		</div>
	);
}

function LegendSkeleton({ tone }: { tone: string }) {
	return (
		<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-2 py-2">
			<span className={cn("h-2 w-2 rounded-full", tone)} />
			<Skeleton className="h-3 min-w-0 flex-1 rounded-full bg-slate-200/70" />
		</div>
	);
}
