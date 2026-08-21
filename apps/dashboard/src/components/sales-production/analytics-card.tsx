import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import type { ReactNode } from "react";

export function SalesProductionAnalyticsCard({
	title,
	value,
	description,
	icon,
	active,
	onClick,
}: {
	title: string;
	value: number;
	description: string;
	icon: ReactNode;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"group min-h-24 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[104px] sm:p-4",
				active && "border-foreground bg-muted/40",
			)}
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<p className="truncate text-xs font-medium text-muted-foreground">
					{title}
				</p>
				{icon}
			</div>
			<div className="flex items-end justify-between gap-3">
				<p className="font-mono text-xl font-semibold tracking-tight tabular-nums">
					{value}
				</p>
				<p className="hidden truncate text-[11px] text-muted-foreground sm:block">
					{description}
				</p>
			</div>
		</button>
	);
}

export function SalesProductionAnalyticsCardSkeleton() {
	return (
		<div className="min-h-24 rounded-xl border bg-card p-3 shadow-sm sm:min-h-[104px] sm:p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="size-4 rounded-full" />
			</div>
			<div className="flex items-end justify-between gap-3">
				<Skeleton className="h-6 w-12" />
				<Skeleton className="hidden h-3 w-24 sm:block" />
			</div>
		</div>
	);
}
