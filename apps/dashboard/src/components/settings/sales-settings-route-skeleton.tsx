import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";

const skeletonKeys = ["first", "second", "third", "fourth"] as const;

export function SalesSettingsRouteSkeleton({
	cardCount = 3,
	showLargeCard = false,
}: {
	cardCount?: number;
	showLargeCard?: boolean;
}) {
	return (
		<section
			className="flex flex-col gap-6"
			aria-label="Loading sales settings"
		>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-6 w-40 rounded" />
				<Skeleton className="h-4 w-80 max-w-full rounded" />
			</div>
			<div className="flex flex-col gap-10">
				{skeletonKeys.slice(0, cardCount).map((key, index) => (
					<div key={key} className="rounded-md border bg-background">
						<div className="flex flex-col gap-2 border-b p-5">
							<Skeleton className="h-4 w-40 rounded" />
							<Skeleton className="h-3 w-80 max-w-full rounded" />
						</div>
						<Skeleton
							className={cn(
								"m-5 rounded",
								showLargeCard && index === cardCount - 1 ? "h-96" : "h-28",
							)}
						/>
					</div>
				))}
			</div>
		</section>
	);
}
