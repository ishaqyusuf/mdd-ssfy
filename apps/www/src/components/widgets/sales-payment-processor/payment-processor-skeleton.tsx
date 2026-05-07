import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";

export function PaymentProcessorSkeleton() {
	return (
		<div className="grid min-h-[640px] gap-0">
			<div className="border-b bg-muted/30 px-6 py-5">
				<div className="flex items-start gap-3 pr-8">
					<Skeleton className="size-10 shrink-0 rounded-md border bg-background" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-40 rounded" />
						<Skeleton className="h-3 w-28 rounded" />
					</div>
					<div className="space-y-2 text-right">
						<Skeleton className="ml-auto h-3 w-14 rounded" />
						<Skeleton className="h-6 w-24 rounded" />
					</div>
				</div>
			</div>

			<div className="grid gap-5 p-6">
				<section className="grid gap-2">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-14 rounded" />
						<Skeleton className="h-3 w-16 rounded" />
					</div>
					<div className="overflow-hidden rounded-md border">
						{[0, 1, 2].map((row) => (
							<div
								key={row}
								className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
							>
								<Skeleton className="size-7 rounded-md" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-24 rounded" />
									<Skeleton className="h-3 w-36 rounded" />
								</div>
							</div>
						))}
					</div>
				</section>

				<section className="grid gap-3">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-16 rounded" />
						<Skeleton className="h-8 w-16 rounded-md" />
					</div>
					<div className="rounded-md border bg-muted/20 px-3 py-2">
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-4 w-28 rounded" />
							<Skeleton className="h-4 w-20 rounded" />
						</div>
					</div>
				</section>

				<section className="grid gap-3">
					<Skeleton className="h-4 w-16 rounded" />
					<div className="grid gap-2 sm:grid-cols-2">
						{[0, 1, 2].map((option) => (
							<div
								key={option}
								className={cn(
									"flex gap-3 rounded-md border p-3",
									option === 2 && "sm:col-span-2",
								)}
							>
								<Skeleton className="size-4 shrink-0 rounded-sm" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-28 rounded" />
									<Skeleton className="h-3 w-full max-w-56 rounded" />
								</div>
							</div>
						))}
					</div>
				</section>

				<Separator />

				<div className="flex items-center gap-3">
					<Skeleton className="h-9 flex-1 rounded-md" />
					<Skeleton className="h-9 w-36 rounded-md" />
				</div>
			</div>
		</div>
	);
}
