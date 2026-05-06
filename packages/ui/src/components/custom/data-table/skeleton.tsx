import { cn } from "../../../utils";
import { Skeleton } from "../../skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../table";

type TableSkeletonProps = {
	columns?: number;
	rows?: number;
	className?: string;
};

const widths = ["w-24", "w-36", "w-28", "w-32", "w-20", "w-16"];

function skeletonItems(prefix: string, count: number) {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

export function TableSkeleton({
	columns = 6,
	rows = 12,
	className,
}: TableSkeletonProps = {}) {
	return (
		<div className={cn("w-full min-w-0 space-y-3", className)}>
			<div className="md:hidden">
				<div className="divide-y divide-border/70 overflow-hidden border-y border-border/70 bg-background">
					{skeletonItems("mobile-row", Math.min(rows, 8)).map((key, index) => (
						<div
							key={key}
							className="flex min-w-0 items-center gap-3 px-3 py-2.5"
						>
							<Skeleton className="size-8 shrink-0 rounded-md" />
							<div className="min-w-0 flex-1 space-y-1.5">
								<div className="flex min-w-0 items-center justify-between gap-3">
									<Skeleton
										className={cn(
											"h-4 min-w-0 flex-1 rounded-full",
											index % 2 === 0 ? "max-w-[68%]" : "max-w-[54%]",
										)}
									/>
									<Skeleton className="h-4 w-16 shrink-0 rounded-full" />
								</div>
								<Skeleton className="h-3 w-full rounded-full" />
								<Skeleton className="h-3 w-2/3 rounded-full" />
							</div>
						</div>
					))}
				</div>
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
											widths[index % widths.length],
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
													widths[(columnIndex + rowIndex) % widths.length],
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
		</div>
	);
}
