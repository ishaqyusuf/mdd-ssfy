import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";

type TableSkeletonProps = {
	columns?: number;
	rows?: number;
	showToolbar?: boolean;
	showPagination?: boolean;
	className?: string;
};

const desktopWidths = ["w-24", "w-36", "w-28", "w-32", "w-20", "w-16"];

function skeletonItems(prefix: string, count: number) {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

export function TableSkeleton({
	columns = 6,
	rows = 12,
	showToolbar = true,
	showPagination = false,
	className,
}: TableSkeletonProps = {}) {
	return (
		<div className={cn("w-full min-w-0 space-y-3", className)}>
			{showToolbar ? <TableSkeletonToolbar /> : null}
			<div className="md:hidden">
				<TableMobileSkeleton rows={Math.min(rows, 8)} />
			</div>
			<div className="hidden overflow-hidden rounded-md border border-border md:block">
				<Table className="min-w-[720px]">
					<TableHeader>
						<TableRow className="h-10 hover:bg-transparent">
							{skeletonItems("head", columns).map((key, index) => (
								<TableHead key={key}>
									<Skeleton
										className={cn(
											"h-3 rounded-full",
											desktopWidths[index % desktopWidths.length],
										)}
									/>
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{skeletonItems("row", rows).map((rowKey, rowIndex) => (
							<TableRow key={rowKey} className="h-[54px] hover:bg-transparent">
								{skeletonItems(`${rowKey}-cell`, columns).map(
									(cellKey, columnIndex) => (
										<TableCell key={cellKey}>
											<Skeleton
												className={cn(
													"h-4 rounded-full",
													desktopWidths[
														(columnIndex + rowIndex) % desktopWidths.length
													],
												)}
											/>
										</TableCell>
									),
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			{showPagination ? <TableSkeletonPagination /> : null}
		</div>
	);
}

function TableSkeletonToolbar() {
	return (
		<div className="flex min-w-0 items-center gap-2 px-3 md:px-0">
			<Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-xs" />
			<Skeleton className="h-9 w-9 shrink-0 rounded-md" />
			<Skeleton className="hidden h-9 w-24 rounded-md sm:block" />
		</div>
	);
}

function TableMobileSkeleton({ rows }: { rows: number }) {
	return (
		<div className="divide-y divide-border/70 overflow-hidden border-y border-border/70 bg-background">
			{skeletonItems("mobile-row", rows).map((key, index) => (
				<div key={key} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
					<Skeleton className="size-8 shrink-0 rounded-md" />
					<div className="min-w-0 flex-1 space-y-1.5">
						<div className="flex min-w-0 items-center justify-between gap-3">
							<Skeleton
								className={cn(
									"h-4 min-w-0 flex-1 rounded-full",
									index % 3 === 0 ? "max-w-[70%]" : "max-w-[56%]",
								)}
							/>
							<Skeleton className="h-4 w-16 shrink-0 rounded-full" />
						</div>
						<div className="flex min-w-0 items-center gap-2">
							<Skeleton className="h-3 w-16 shrink-0 rounded-full" />
							<Skeleton className="h-3 w-10 shrink-0 rounded-full" />
							<Skeleton className="h-3 min-w-0 flex-1 rounded-full" />
						</div>
						<div className="flex min-w-0 items-center justify-between gap-3">
							<Skeleton className="h-3 min-w-0 flex-1 rounded-full" />
							<Skeleton className="h-3 w-14 shrink-0 rounded-full" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function TableSkeletonPagination() {
	return (
		<div className="hidden items-center justify-between px-1 md:flex">
			<Skeleton className="h-8 w-32 rounded-md" />
			<div className="flex items-center gap-2">
				<Skeleton className="h-8 w-20 rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
			</div>
		</div>
	);
}
