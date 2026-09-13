import { Skeleton } from "@gnd/ui/skeleton";

export function AssistantAccessSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-3">
				{[0, 1, 2].map((item) => (
					<Skeleton key={item} className="h-28 rounded-lg" />
				))}
			</div>
			<Skeleton className="h-14 w-full" />
			<Skeleton className="h-[360px] w-full" />
		</div>
	);
}
