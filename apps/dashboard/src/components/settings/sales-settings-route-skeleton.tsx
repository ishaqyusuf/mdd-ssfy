import { cn } from "@gnd/ui/cn";

const skeletonKeys = ["first", "second", "third", "fourth"] as const;

export function SalesSettingsRouteSkeleton({
	cardCount = 3,
	showLargeCard = false,
}: {
	cardCount?: number;
	showLargeCard?: boolean;
}) {
	return (
		<section className="space-y-6" aria-label="Loading sales settings">
			<div className="space-y-2">
				<div className="h-6 w-40 animate-pulse rounded bg-muted" />
				<div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
			</div>
			<div className="space-y-10">
				{skeletonKeys.slice(0, cardCount).map((key, index) => (
					<div
						key={key}
						className="animate-pulse rounded-md border bg-background"
					>
						<div className="space-y-2 border-b p-5">
							<div className="h-4 w-40 rounded bg-muted" />
							<div className="h-3 w-80 max-w-full rounded bg-muted" />
						</div>
						<div
							className={cn(
								"m-5 rounded bg-muted/70",
								showLargeCard && index === cardCount - 1 ? "h-96" : "h-28",
							)}
						/>
					</div>
				))}
			</div>
		</section>
	);
}
